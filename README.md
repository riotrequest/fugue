# Fugue

A pixel-art survival game that runs in your browser. You wake beside a dying fire after the end of the world, with no memory of how you got there. Keep the fire burning. Keep yourself alive. Others will see the light.

**Play it:** [fugue.riotrequest.com](https://fugue.riotrequest.com)

It works on phones, but it's at its best on a computer.

## What it is

- **A fire to keep.** It always burns down. Wind and cold make it hungrier; rain and snow eat at it unless it has a roof.
- **A body to keep.** Warmth, food, water and health. Let one run out and the rest follow.
- **A winter to outlast.** Each night is longer and colder until deep winter. Hold on until the thaw.
- **People who find the fire.** Give them jobs and they work on their own, but every one of them has to be fed and watered. Some work like two people. Some barely work. Some steal.
- **Places to go.** Trips out by day turn up salvage, medicine, and pieces of what happened.
- **More than one ending.**
- **Easy, normal or hard,** picked when you first wake.

Everything is drawn and every sound is synthesized in code. There are no image or audio files.

## Run it yourself

No build step and no dependencies. You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm start
```

Then open http://localhost:5173. The game is plain ES modules, so any static file server works. It just can't be opened straight from the file system.

`?speed=8` in the address fast-forwards time, which is handy for testing.

## Tests

```bash
npm test
```

The tests use Node's built-in test runner. Besides unit and content checks, a scripted bot plays whole games in simulated time on every difficulty. Those playthroughs are the balance contract: a careful player should reach the thaw, and doing nothing should get you killed.

## How it's put together

```
js/
  sim/       the game itself: pure, deterministic, no DOM, runs under Node
    content/   what exists: resources, actions, buildings, roles, events, prose
    systems/   how it behaves: one module per mechanism
    tuning.js  every balance number, including the difficulty settings
    views.js   read models for the UI, renderer and audio
  render/    the pixel-art clearing, drawn on a 320×180 canvas
  audio/     Web Audio ambience, music and sound effects
  ui/        the DOM panels, diffed from the sim's read models
  main.js    wires it all together
dev/         harness pages for the renderer and the audio
tests/       node:test suites and the playthrough bot
online.php   optional "N playing" counter (see below)
```

The sim is the heart of it. Its state is plain JSON and all randomness comes from a seeded generator, so a game is fully determined by its seed and its inputs. Content is data: actions, events and their effects are small JSON objects interpreted by `systems/effects.js`, so most new content needs no new code.

## The online counter

`online.php` powers the little "N playing" note in the top bar. Each open game pings it about once a minute with a random id made up on the spot; ids seen in the last couple of minutes are counted. It stores nothing else. It needs PHP and a writable `fugue-data/` folder two levels above the script. Without it, the counter simply stays hidden, so the game runs fine on any static host.

## Contributing

Issues and pull requests are welcome. Run `npm test` before sending a change. If you touch balance numbers, the playthrough tests will tell you whether the game is still winnable.

## License

[MIT](LICENSE)
