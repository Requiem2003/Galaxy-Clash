#!/usr/bin/env python3
"""
battle_story_ai.py
===================

This module implements a simple cinematic battle storyteller inspired by the
design outlined in the provided "Cinematic Battle Storytelling AI Design" PDF.

Overview
--------
The goal of this script is to take two custom team rosters along with
optional battlefield information and generate a gritty, cinematic battle
narrative.  The narrative follows a structured template:

1. A title line naming the battle.
2. A descriptive introduction establishing the setting and atmosphere.
3. A listing of each team, including their units and total cost.
4. A pre‑battle analysis discussing strengths, weaknesses and possible
   strategies for each side.
5. Three sequential combat rounds.  Each round starts with positioning
   manoeuvres, applies synergies and special abilities, resolves attacks
   and morale shifts, then summarises the action in a series of bullet
   points along with casualties.
6. A final verdict declaring the winner, explaining why they won and
   providing a last cinematic flourish.

The simulation engine here is intentionally lightweight.  It does not
attempt to model every nuance of a tabletop wargame.  Instead, it uses
abstracted unit statistics and simple probabilities to decide who hits
whom and when special abilities fire.  The point is not to compute
perfectly balanced outcomes but to ground the narrative in plausible
mechanics, as emphasised in the original design document【808377125943113†L0-L1】【103948462111678†screenshot】.

Usage
-----
To use this script you can run it directly from the command line.  It
accepts a JSON file describing two teams and optional battlefield
settings.  For example::

    python battle_story_ai.py battle.json

Where ``battle.json`` might look like::

    {
        "budget": 500,
        "teams": [
            {
                "name": "Vader's Fist",
                "units": ["Darth Vader", "Emperor Palpatine", "Stormtrooper", "Stormtrooper"]
            },
            {
                "name": "Saw's Renegades",
                "units": ["Saw Gerrera", "Clone Trooper", "Clone Trooper", "Mother Talzin"]
            }
        ],
        "battlefield": {
            "location": "ruined temple on Dathomir",
            "weather": "foggy night",
            "terrain": "dense jungle"
        }
    }

If no battlefield is provided the script will randomly choose one from
predefined settings.  You can of course modify or extend the unit
database at the bottom of this file to include new characters, stats
and abilities.

This implementation is intentionally self‑contained.  It uses only the
Python standard library so that it can run in restricted environments
without extra dependencies.  Feel free to adapt and expand it to suit
your gaming system or narrative preferences.

"""

from __future__ import annotations

import json
import math
import os
import random
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


###############################################################################
# Data structures
###############################################################################

@dataclass
class UnitType:
    """Represents a type of unit with stats, cost and special rules."""

    name: str
    tier: int
    cost: int
    health: int
    damage: int
    description: str
    role: str = "Trooper"
    abilities: List[str] = field(default_factory=list)
    synergies: Dict[str, Dict[str, float]] = field(default_factory=dict)
    leader_ability: Optional[str] = None


@dataclass
class Unit:
    """Represents a specific instance of a unit on the battlefield."""

    template: UnitType
    current_health: int = field(init=False)
    is_alive: bool = field(default=True)
    status_effects: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.current_health = self.template.health

    def take_damage(self, amount: int) -> bool:
        """Apply damage to the unit.  Returns True if the unit dies."""
        if not self.is_alive:
            return False
        self.current_health -= amount
        if self.current_health <= 0:
            self.is_alive = False
            return True
        return False

    def heal_full(self) -> None:
        self.current_health = self.template.health
        self.is_alive = True


@dataclass
class Team:
    """Represents a team of units participating in the battle."""

    name: str
    units: List[Unit]
    morale: float = 1.0  # baseline morale (1.0 = neutral)
    killed_units: List[Unit] = field(default_factory=list)

    @property
    def alive_units(self) -> List[Unit]:
        return [u for u in self.units if u.is_alive]

    @property
    def total_cost(self) -> int:
        return sum(u.template.cost for u in self.units)

    def has_unit(self, unit_name: str) -> bool:
        return any(u.template.name == unit_name and u.is_alive for u in self.units)

    def reset(self) -> None:
        for u in self.units:
            u.heal_full()
        self.killed_units.clear()
        self.morale = 1.0

    def apply_morale_change(self, delta: float) -> None:
        """Modify morale but keep within reasonable bounds [0.1, 2.0]."""
        self.morale = max(0.1, min(2.0, self.morale + delta))


###############################################################################
# Unit database and special rule definitions
###############################################################################

# The following dictionary defines a handful of units inspired by the Star
# Wars universe.  Each entry includes base stats, cost tiers and (when
# relevant) simple descriptions of abilities or synergies.  You can modify
# or extend this dictionary to include your own characters.
UNIT_DATABASE: Dict[str, UnitType] = {
    "Darth Vader": UnitType(
        name="Darth Vader",
        tier=1,
        cost=120,
        health=120,
        damage=35,
        description="Sith Lord wielding a red lightsaber and the Dark Side",
        role="Leader",
        abilities=["dark_presence", "force_strike"],
        synergies={"Stormtrooper": {"enemy_accuracy_multiplier": 0.8}},
        leader_ability="fear_aura",
    ),
    "Emperor Palpatine": UnitType(
        name="Emperor Palpatine",
        tier=1,
        cost=130,
        health=100,
        damage=40,
        description="Galactic Emperor and master of the Sith, unleashing Force lightning",
        role="Leader",
        abilities=["force_lightning"],
        synergies={},
        leader_ability="morale_break",
    ),
    "Grand Admiral Thrawn": UnitType(
        name="Grand Admiral Thrawn",
        tier=2,
        cost=80,
        health=80,
        damage=15,
        description="Strategic genius providing tactical insight",
        role="Leader",
        abilities=["tactical_insight"],
        leader_ability="tactical_boost",
    ),
    "Mother Talzin": UnitType(
        name="Mother Talzin",
        tier=2,
        cost=90,
        health=90,
        damage=20,
        description="Dathomirian witch with necromantic powers",
        role="Leader",
        abilities=["resurrection"],
        leader_ability="revive",
    ),
    "Stormtrooper": UnitType(
        name="Stormtrooper",
        tier=3,
        cost=40,
        health=40,
        damage=10,
        description="Imperial foot soldier with blaster rifle",
        role="Trooper",
        abilities=[],
        synergies={},
    ),
    "Clone Trooper": UnitType(
        name="Clone Trooper",
        tier=3,
        cost=45,
        health=45,
        damage=12,
        description="Elite soldier cloned from Jango Fett",
        role="Trooper",
        abilities=[],
        synergies={"Jedi": {"morale_bonus": 0.1}},
    ),
    "Saw Gerrera": UnitType(
        name="Saw Gerrera",
        tier=2,
        cost=70,
        health=85,
        damage=20,
        description="Hard‑boiled guerrilla leader",
        role="Leader",
        abilities=["reckless_attack"],
        leader_ability="inspires_rebels",
    ),
    "Jedi": UnitType(
        name="Jedi",
        tier=2,
        cost=90,
        health=95,
        damage=25,
        description="Force‑sensitive warrior with a lightsaber",
        role="Leader",
        abilities=["force_push"],
        leader_ability="protective_aura",
    ),
    "Wookiee Warrior": UnitType(
        name="Wookiee Warrior",
        tier=3,
        cost=50,
        health=60,
        damage=18,
        description="Large, strong combatant wielding a bowcaster",
        role="Trooper",
        abilities=["furious_charge"],
        synergies={},
    ),
}


###############################################################################
# Battlefield presets
###############################################################################

# Predefined battlefields with flavourful location, weather and terrain
PRESET_BATTLEFIELDS: List[Dict[str, str]] = [
    {
        "location": "an ancient jungle temple",
        "weather": "a misty midnight downpour",
        "terrain": "dense jungle with crumbling ruins",
    },
    {
        "location": "the fiery pits of Mustafar",
        "weather": "volcanic ash rain and searing heat",
        "terrain": "rocky slopes and flowing lava",
    },
    {
        "location": "a snowy tundra on Hoth",
        "weather": "blizzard conditions with biting cold",
        "terrain": "open snowfields and scattered ice caverns",
    },
    {
        "location": "a windswept desert plain on Tatooine",
        "weather": "a swirling sandstorm under a scorching sun",
        "terrain": "open desert with occasional rocky outcroppings",
    },
    {
        "location": "a rain‑soaked urban battlefield",
        "weather": "thunderstorms and flickering street lights",
        "terrain": "tight alleyways and ruined buildings",
    },
]


###############################################################################
# Helper functions for battle logic
###############################################################################

def create_units_from_names(names: List[str]) -> List[Unit]:
    """Convert a list of unit names into Unit instances from the database."""
    units: List[Unit] = []
    for name in names:
        if name not in UNIT_DATABASE:
            raise ValueError(f"Unknown unit '{name}'. Please add it to UNIT_DATABASE.")
        unit_type = UNIT_DATABASE[name]
        units.append(Unit(template=unit_type))
    return units


def pick_random_battlefield() -> Dict[str, str]:
    """Select a random battlefield from the preset list."""
    return random.choice(PRESET_BATTLEFIELDS)


def apply_synergies(attacker: Unit, friendly_team: Team, enemy_team: Team, event_context: Dict[str, float]) -> None:
    """Modify the event context based on active synergies.

    For each synergy defined on the attacker's template, check if the synergy's
    key appears among friendly units.  If so, adjust the context accordingly.
    """
    for target_unit_type, modifiers in attacker.template.synergies.items():
        # If friendly team has a unit of the target type alive
        if friendly_team.has_unit(target_unit_type):
            for key, multiplier in modifiers.items():
                if key == "enemy_accuracy_multiplier":
                    # Lower enemy accuracy
                    event_context.setdefault("enemy_accuracy_multiplier", 1.0)
                    event_context["enemy_accuracy_multiplier"] *= multiplier
                elif key == "morale_bonus":
                    # Increase friendly morale slightly
                    friendly_team.apply_morale_change(multiplier)


def resolve_attack(attacker: Unit, defender: Unit, context: Dict[str, float]) -> Tuple[bool, str]:
    """Simulate an attack from attacker to defender.

    Returns a tuple (killed, description).  The description attempts to
    capture a cinematic, gritty tone: lethal strikes describe viscera
    and smoke, whereas non‑fatal wounds still hint at searing flesh or
    smashed armour.  These evocative phrases aim to follow the PDF's
    suggestion that the narration should be graphic and intense【808377125943113†L0-L1】.
    """
    # Base hit chance depends on attacker and defender roles and morale
    base_hit_chance = 0.6 + 0.1 * (attacker.template.damage / 30)  # stronger attackers are more likely to hit
    # Apply accuracy penalty from enemy aura (e.g., Dark Presence)
    accuracy_modifier = context.get("accuracy_modifier", 1.0)
    hit_chance = base_hit_chance * accuracy_modifier
    hit = random.random() < min(max(hit_chance, 0.1), 0.95)

    if not hit:
        return False, f"{attacker.template.name} fires at {defender.template.name} but the shot goes wide"

    # Calculate damage; incorporate attacker morale as small bonus
    damage_multiplier = 1.0 + 0.2 * (context.get("attacker_morale", 1.0) - 1.0)
    damage = int(attacker.template.damage * damage_multiplier)
    killed = defender.take_damage(damage)

    # Choose some visceral descriptors for dramatic effect
    lethal_descriptions = [
        "carving through armour, blood spraying into the mud",
        "searing flesh and leaving smoking armour plates",
        "splitting bone and sinew with a wet crack",
        "sending limbs flying in a shower of sparks and gore",
        "driving a blade cleanly through the heart with a hiss of steam",
    ]
    wound_descriptions = [
        "leaving a smoking gash",
        "ripping open armour and drawing blood",
        "searing through flesh and eliciting a scream",
        "blasting a chunk of armour away",
        "carving a deep wound that sprays crimson",
    ]

    if killed:
        phrase = random.choice(lethal_descriptions)
        return True, (
            f"{attacker.template.name} strikes down {defender.template.name}, {phrase}"
        )
    else:
        phrase = random.choice(wound_descriptions)
        return False, (
            f"{attacker.template.name} hits {defender.template.name}, {phrase}"
        )


def apply_leader_abilities(team: Team, enemy: Team, context: Dict[str, float], round_number: int) -> List[str]:
    """Trigger leader abilities at the start of a round.

    Returns a list of narrative strings describing the activated abilities.
    The context dict may be updated to reflect buffs or debuffs.
    """
    descriptions: List[str] = []
    for unit in team.alive_units:
        ability = unit.template.leader_ability
        if not ability:
            continue
        # Some abilities only activate once per battle or at certain rounds
        if ability == "fear_aura" and round_number == 1:
            # Darth Vader's fear aura lowers enemy accuracy
            context["accuracy_modifier"] = context.get("accuracy_modifier", 1.0) * 0.85
            descriptions.append(
                f"{unit.template.name}'s menacing presence unsettles the enemy, making their shots waver"
            )
        elif ability == "morale_break" and round_number == 1:
            # Palpatine demoralises the opposition on the opening volley
            enemy.apply_morale_change(-0.2)
            descriptions.append(
                f"{unit.template.name} cackles as dark energy fractures enemy resolve"
            )
        elif ability == "tactical_boost" and round_number == 1:
            # Thrawn's boost increases friendly accuracy
            context["accuracy_modifier"] = context.get("accuracy_modifier", 1.0) * 1.15
            descriptions.append(
                f"{unit.template.name}'s calculated strategies sharpen his troops' aim"
            )
        elif ability == "revive" and round_number >= 2:
            # Mother Talzin attempts to revive one fallen friendly unit
            fallen = [u for u in team.killed_units if u.template.health > 0 and not u.is_alive]
            if fallen:
                revived = random.choice(fallen)
                revived.is_alive = True
                revived.current_health = max(1, revived.template.health // 2)  # half health
                team.killed_units.remove(revived)
                team.units.append(revived)
                descriptions.append(
                    f"{unit.template.name} chants ancient Dathomirian spells, reviving {revived.template.name} from death"
                )
                # Revived units fight at reduced effectiveness
                context.setdefault("revived_units", []).append(revived)
        elif ability == "inspires_rebels" and round_number == 1:
            # Saw Gerrera inspires his partisans boosting morale
            team.apply_morale_change(0.2)
            descriptions.append(
                f"{unit.template.name}'s defiant roar emboldens his troops to fight harder"
            )
        elif ability == "protective_aura" and round_number == 1:
            # Jedi protective aura adds a small defensive buff
            context["defense_buff"] = context.get("defense_buff", 0) + 5
            descriptions.append(
                f"{unit.template.name} projects a shimmering aura, shielding nearby allies"
            )
    return descriptions


def compute_round_events(
    team1: Team, team2: Team, context: Dict[str, float], round_number: int
) -> Tuple[List[str], List[str]]:
    """Simulate one combat round and return bullet points for both teams.

    Returns a tuple (round_descriptions, casualties_descriptions).  The first
    element contains narrative bullets highlighting events of the round.  The
    second element records casualties.
    """
    bullets: List[str] = []
    casualties: List[str] = []

    # Randomise the order in which units act
    acting_units = team1.alive_units + team2.alive_units
    random.shuffle(acting_units)

    # For each acting unit, pick a target from the opposing team
    for unit in acting_units:
        # Skip dead units
        if not unit.is_alive:
            continue
        # Determine which team the unit belongs to
        friendly_team = team1 if unit in team1.units else team2
        enemy_team = team2 if friendly_team is team1 else team1
        # Skip if enemy has no more units
        if not enemy_team.alive_units:
            break
        target = random.choice(enemy_team.alive_units)

        # Event context includes morale and any active accuracy modifiers
        event_context: Dict[str, float] = {
            "attacker_morale": friendly_team.morale,
            "accuracy_modifier": context.get("accuracy_modifier", 1.0),
        }
        # Apply synergies for this attack
        apply_synergies(unit, friendly_team, enemy_team, event_context)
        killed, desc = resolve_attack(unit, target, event_context)
        bullets.append(desc)
        if killed:
            enemy_team.killed_units.append(target)
            casualties.append(target.template.name)
            # Morale impact: when a leader dies, morale drops drastically
            if target.template.role == "Leader":
                enemy_team.apply_morale_change(-0.3)
                bullets.append(
                    f"The death of {target.template.name} sends shockwaves through {enemy_team.name}'s ranks"
                )
            else:
                enemy_team.apply_morale_change(-0.05)
        else:
            # Slight morale boost for wounding an enemy
            friendly_team.apply_morale_change(0.02)

    # Remove slain units from the alive list (they remain in units for potential revival)
    # (No explicit removal needed; alive_units property filters them out.)

    # Summarise casualties
    if casualties:
        unique_casualties = {}
        for c in casualties:
            unique_casualties[c] = unique_casualties.get(c, 0) + 1
        casualties_str = ", ".join(
            f"{count}× {name}" if count > 1 else f"1× {name}" for name, count in unique_casualties.items()
        )
        bullets.append(
            f"Casualties this round: {casualties_str}"
        )
    return bullets, casualties


def pre_battle_analysis(team: Team, enemy: Team) -> str:
    """Generate a pre‑battle analysis paragraph for one team."""
    strengths: List[str] = []
    weaknesses: List[str] = []

    # Evaluate strengths based on leader types and abilities
    for unit in team.alive_units:
        if unit.template.role == "Leader":
            if unit.template.name in ("Darth Vader", "Emperor Palpatine"):
                strengths.append("terrifying Force abilities and crowd control")
            elif unit.template.name == "Grand Admiral Thrawn":
                strengths.append("keen strategic insight and coordination")
            elif unit.template.name == "Mother Talzin":
                strengths.append("dark magic and the power to raise the dead")
            elif unit.template.name == "Saw Gerrera":
                strengths.append("guerrilla tactics and high morale")
            elif unit.template.name == "Jedi":
                strengths.append("a protective aura and disciplined lightsaber skills")
    # Generic troopers
    trooper_count = sum(1 for u in team.alive_units if u.template.role == "Trooper")
    if trooper_count > 0:
        strengths.append(f"a cadre of {trooper_count} troopers providing steady fire support")

    # Weaknesses
    # If reliant on leaders
    if any(u.template.role == "Leader" for u in team.alive_units) and trooper_count <= 2:
        weaknesses.append("over‑reliance on a few powerful leaders")
    if trooper_count > 4:
        weaknesses.append("limited heavy support for so many troops")

    # Deduplicate strengths descriptions
    unique_strengths = list(dict.fromkeys(strengths))
    unique_weaknesses = list(dict.fromkeys(weaknesses))
    # Construct paragraph
    strengths_text = "; ".join(unique_strengths) if unique_strengths else "unknown strengths"
    weaknesses_text = "; ".join(unique_weaknesses) if unique_weaknesses else "few obvious weaknesses"
    return (
        f"{team.name} enters the fray with {strengths_text}. "
        f"However, they may suffer from {weaknesses_text}."
    )


def determine_winner(team1: Team, team2: Team) -> Tuple[str, str]:
    """Decide the winner based on remaining units and return winner name and recap."""
    team1_alive = len(team1.alive_units)
    team2_alive = len(team2.alive_units)
    if team1_alive > team2_alive:
        winner = team1
        loser = team2
    elif team2_alive > team1_alive:
        winner = team2
        loser = team1
    else:
        # Tie breaker: compare total remaining health
        team1_health = sum(u.current_health for u in team1.alive_units)
        team2_health = sum(u.current_health for u in team2.alive_units)
        if team1_health >= team2_health:
            winner = team1
            loser = team2
        else:
            winner = team2
            loser = team1
    # Compose recap
    recap = (
        f"In the end, {winner.name} prevailed over {loser.name}. "
        f"While {loser.name} fought bravely, {winner.name}'s remaining fighters"
        f" outlasted their foes."
    )
    return winner.name, recap


###############################################################################
# Narrative generation functions
###############################################################################

def generate_battle_report(
    team1: Team,
    team2: Team,
    battlefield: Dict[str, str],
    budget: Optional[int] = None,
) -> str:
    """Generate the full battle narrative given two teams and a battlefield."""
    # Validate budgets
    if budget is not None:
        if team1.total_cost > budget:
            raise ValueError(f"Team {team1.name} exceeds the budget (cost {team1.total_cost} > {budget}).")
        if team2.total_cost > budget:
            raise ValueError(f"Team {team2.name} exceeds the budget (cost {team2.total_cost} > {budget}).")

    # Build title
    title = f"The Battle of {battlefield['location'].title()}"

    # Battlefield introduction
    introduction = (
        f"On {battlefield['weather']}, the forces assemble at {battlefield['location']}. "
        f"The terrain consists of {battlefield['terrain']}. Visibility is poor, and every shadow could hide an enemy."
    )

    # Team listings
    def format_team_list(team: Team) -> str:
        listing_lines = [f"**{team.name}** (Total: {team.total_cost} pts)"]
        for u in team.units:
            listing_lines.append(
                f"  - {u.template.name} (Tier {u.template.tier}, {u.template.cost} pts)"
            )
        return "\n".join(listing_lines)

    team_lists = f"\n{format_team_list(team1)}\n\n{format_team_list(team2)}\n"

    # Pre‑battle analysis
    analysis = (
        f"Pre‑Battle Analysis:\n"
        f"{pre_battle_analysis(team1, team2)}\n"
        f"{pre_battle_analysis(team2, team1)}"
    )

    # Simulate rounds
    round_sections: List[str] = []
    # Reset teams for battle simulation
    team1.reset()
    team2.reset()

    context: Dict[str, float] = {}
    for round_num in range(1, 4):
        # Apply leader abilities at the start of the round
        leader_descriptions: List[str] = []
        leader_descriptions += apply_leader_abilities(team1, team2, context, round_num)
        leader_descriptions += apply_leader_abilities(team2, team1, context, round_num)

        # Build header
        round_text = [f"Round {round_num}"]
        # Add leader ability narratives if any
        round_text.extend(leader_descriptions)

        # Resolve actions
        events, casualties = compute_round_events(team1, team2, context, round_num)
        round_text.extend(events)

        # List casualties at end of round for both sides
        def summarise_losses(team: Team) -> str:
            lost = [u for u in team.killed_units if not u.is_alive]
            if not lost:
                return f"No significant losses for {team.name}."
            counts: Dict[str, int] = {}
            for u in lost:
                counts[u.template.name] = counts.get(u.template.name, 0) + 1
            summary = ", ".join(
                f"{num}× {name}" if num > 1 else f"1× {name}" for name, num in counts.items()
            )
            return f"{team.name} casualties: {summary}."

        round_text.append(summarise_losses(team1))
        round_text.append(summarise_losses(team2))
        round_sections.append("\n".join("* " + line for line in round_text))

    # Determine the winner and recap
    winner_name, recap = determine_winner(team1, team2)
    final_section = (
        f"Casualties & Survivors:\n"
        f"{summarise_final_state(team1)}\n"
        f"{summarise_final_state(team2)}\n\n"
        f"Winner: **{winner_name}**\n"
        f"{recap}"
    )

    # Assemble full report
    report_parts = [f"# {title}", introduction, "Team Rosters:", team_lists, analysis]
    report_parts.extend(round_sections)
    report_parts.append(final_section)
    return "\n\n".join(report_parts)


def summarise_final_state(team: Team) -> str:
    """Generate a final summary of survivors and dead for a team."""
    survivors = [u for u in team.units if u.is_alive]
    dead = [u for u in team.units if not u.is_alive]
    parts: List[str] = []
    if survivors:
        names = ", ".join(u.template.name for u in survivors)
        parts.append(f"Survivors for {team.name}: {names}.")
    else:
        parts.append(f"No survivors for {team.name}.")
    if dead:
        names = ", ".join(u.template.name for u in dead)
        parts.append(f"Fallen for {team.name}: {names}.")
    return " ".join(parts)


###############################################################################
# Command‑line interface
###############################################################################

def load_battle_config(path: str) -> Tuple[Team, Team, Dict[str, str], Optional[int]]:
    """Load a JSON battle configuration file and produce Team objects."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Budget
    budget = data.get("budget")
    # Teams
    teams = data["teams"]
    if len(teams) != 2:
        raise ValueError("Exactly two teams must be specified in the configuration.")
    team_objs: List[Team] = []
    for t in teams:
        name = t.get("name") or f"Team {len(team_objs) + 1}"
        units = create_units_from_names(t["units"])
        team_objs.append(Team(name=name, units=units))
    # Battlefield
    battlefield = data.get("battlefield") or pick_random_battlefield()
    return team_objs[0], team_objs[1], battlefield, budget


def main(argv: List[str]) -> int:
    if len(argv) < 2:
        print("Usage: python battle_story_ai.py <battle_config.json>")
        return 1
    config_path = argv[1]
    if not os.path.isfile(config_path):
        print(f"Configuration file '{config_path}' not found.")
        return 1
    try:
        team1, team2, battlefield, budget = load_battle_config(config_path)
        report = generate_battle_report(team1, team2, battlefield, budget)
        print(report)
    except Exception as e:
        print(f"Error: {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))