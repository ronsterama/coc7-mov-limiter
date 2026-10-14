# CoC7 Movement

Movement rules for **Call of Cthulhu 7th Edition** in Foundry VTT (CoC7 system),
in one module. It combines two earlier modules: the *Movement Governor*
(`coc7-mov-limiter`) and the *Exploration Movement Limiter*
(`coc7-exploration-limiter`).

## Install

In Foundry's **Add-on Modules → Install Module**, paste this manifest URL:

```
https://github.com/ronsterama/coc7-mov-limiter/releases/latest/download/module.json
```

Future versions show up under **Check for Update**. If you ever installed the
separate Exploration Limiter module, uninstall it first: this module replaces it.
Your existing Governor settings carry over, because the module id is unchanged.

## Combat: the Governor

Off by default. Turn on **Restrict movement to CoC7 rules** in module settings.

- Only applies during a started combat, and only to tokens in that combat's
  turn order.
- Walking is free up to the token's MOV. Running (MOV up to MOV × the running
  multiplier, default 5) is allowed with a one-time "breaks into a run" chat
  message.
- A move beyond the running cap is blocked, or allowed with a GM-only warning if
  **Block moves beyond the run cap** is off.
- Distance accumulates across partial drags in a turn and resets when that
  combatant's turn starts.
- GM moves are exempt by default (**Exempt GM-controlled moves**).
- **Clear movement trails each turn** (default on) tidies Foundry's faded
  movement-path trails for every combatant. It is independent of the cap.

## Exploration: the turn queue

For non-combat map exploration.

1. In **Configure Scene**, tick **Exploration Scene**.
2. In the Token controls, click the hiking-boot button to open the exploration HUD.
3. **Start** builds a round-robin queue from the connected, non-GM players who own
   a token on the scene. Only the active player's token(s) can move, up to
   **Move × the movement multiplier** (default 2) per turn. Others are told it is
   not their turn. GM and NPC tokens are never restricted.
4. **Next**, **Reset** and **End** move the queue along. Player requests are relayed
   to a connected GM, so a GM must be online for these.

## Combat takes precedence

A token that is a combatant in a started combat follows the Governor's rules. The
exploration queue never blocks a combatant mid-fight.

## Known limits

- Distance is measured as a straight line from the old to the new position, not
  along a dragged multi-waypoint path.
- Both modes compare grid distance directly with MOV, so the scene's grid unit
  must match the unit MOV is expressed in at your table. Use the multipliers to
  compensate if it does not.
- The merged module has not yet been run in a live world. It reuses the code of
  both original modules unchanged apart from how it is wired together.

## Releasing a new version

Commit and push, then push a tag (`git tag vX.Y.Z`, `git push origin vX.Y.Z`).
`.github/workflows/release.yml` creates the release, stamps the version and URLs
into `module.json`, and attaches `module.zip`.
