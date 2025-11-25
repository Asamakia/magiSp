# CLAUDE.md - Magic Spirit Project Guide for AI Assistants

## Project Overview

**Magic Spirit (マジックスピリット)** is a browser-based trading card game built with React. It's a 2-player turn-based strategy game featuring monsters, magic cards, and field cards with various attributes (fire, water, light, dark, primitive, etc.).

### Technology Stack
- **Framework**: React 19.2.0
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Testing**: Jest + React Testing Library
- **Language**: JavaScript (JSX)
- **Styling**: Inline styles with CSS-in-JS approach

### Project Status
Currently a **prototype version** with local 2-player gameplay. The recent commit (94a7a4d) introduced the Magic Spirit game implementation.

---

## Directory Structure

```
/home/user/magiSp/
├── public/              # Static assets
│   ├── index.html       # HTML entry point
│   ├── manifest.json    # PWA manifest
│   └── *.png, *.ico     # Icons and images
├── src/
│   ├── App.js           # Main app component (renders MagicSpiritGame)
│   ├── App.css          # App styling
│   ├── magic-spirit.jsx # Main game logic (1473 lines) ⭐
│   ├── index.js         # React entry point
│   ├── index.css        # Global styles
│   ├── setupTests.js    # Test configuration
│   ├── App.test.js      # App tests
│   └── reportWebVitals.js # Performance monitoring
├── package.json         # Dependencies and scripts
└── README.md            # Standard CRA documentation
```

### Key Files

**`src/magic-spirit.jsx`** (Main game file - 1473 lines)
- All game logic, components, and state management
- Self-contained React component with hooks
- Includes card data, game rules, and UI rendering

**`src/App.js`** (Entry point)
- Simple wrapper that renders `<MagicSpiritGame />`
- No additional logic

**`package.json`**
- React 19.2.0 (latest)
- Testing libraries included
- Standard CRA scripts

---

## Game Mechanics Summary

Understanding these mechanics is crucial for working with the codebase:

### Core Concepts

1. **Life Points (LP)**: Each player starts with 6000 LP. Reaching 0 LP means defeat.

2. **SP Tokens (Spirit Points)**: Resource system for playing cards
   - Start with 1 SP
   - Gain 1 SP per turn (max 10)
   - Active SP: Available to use
   - Rested SP: Used this turn, returns next turn

3. **Card Types**:
   - **Monster Cards**: Have attack/HP, can battle
   - **Magic Cards**: One-time effects, go to graveyard
   - **Field Cards**: Persistent effects on the battlefield

4. **Attributes**: 炎 (fire), 水 (water), 光 (light), 闇 (dark), 原始 (primitive), なし (none)

5. **Game Phases** (per turn):
   - **ターン開始** (Turn Start): SP refresh, monster ready
   - **ドロー** (Draw): Draw 1 card
   - **メイン** (Main): Summon monsters, play cards
   - **バトル** (Battle): Attack with monsters
   - **エンド** (End): Turn end, switch player

6. **Combat System**:
   - Monsters can attack other monsters or directly attack player
   - Counter attacks deal 30% damage back
   - Direct attacks reduced 50% if opponent has monsters
   - Field cards reduce direct damage to 75%
   - Monsters cannot attack on summon turn

### Game State

The game uses React hooks with extensive state:
```javascript
// Player states (duplicated for P1 and P2)
- Life points
- Deck, Hand, Field (5 slots), Graveyard
- Active SP and Rested SP
- Field card

// Game flow
- Current turn, current player
- Current phase (0-4)
- isFirstTurn flag (first turn no attacks)
- Winner state

// UI state
- selectedHandCard
- selectedFieldMonster
- attackingMonster
```

---

## Development Guidelines

### Working with Game Logic

**Location**: All game logic is in `src/magic-spirit.jsx`

**Key Functions to Understand**:

1. **`initGame()`** (line ~624): Initialize/reset game state
2. **`processPhase(phaseIndex)`** (line ~705): Handle phase transitions
3. **`summonCard(card, slotIndex)`** (line ~767): Place cards on field
4. **`attack(attackerIndex, targetIndex)`** (line ~867): Combat resolution
5. **`getCurrentPlayerData()`** (line ~662): Get active player state
6. **`getOpponentData()`** (line ~687): Get opponent state

**Important Constants**:
```javascript
INITIAL_LIFE = 6000
INITIAL_SP = 1
MAX_SP = 10
INITIAL_HAND_SIZE = 5
DECK_SIZE = 40
COUNTER_ATTACK_RATE = 0.3
```

### Component Structure

The file contains several React components:

1. **`MagicSpiritGame`** (main export): Root game component
2. **`Card`** (line ~292): Renders individual cards
3. **`FieldMonster`** (line ~415): Renders monsters on field
4. **`SPTokens`** (line ~531): SP visualization
5. **`GameLog`** (line ~565): Battle log display

### Styling Approach

- **All styles are inline** using JavaScript objects
- `styles` object (line ~123) contains reusable style definitions
- Uses gradients, animations, and CSS-in-JS patterns
- Responsive design with flexbox/grid
- Dark theme with neon accents

**Color scheme**:
```javascript
ATTRIBUTE_COLORS = {
  '炎': red/orange gradients
  '水': blue gradients
  '光': gold/yellow gradients
  '闇': purple/dark gradients
  '原始': green/earth tones
  'なし': gray
}
```

### Adding New Features

**To add a new card**:
```javascript
// Add to SAMPLE_CARDS array (line ~6)
{
  id: 'C0000XXX',
  name: 'Card Name',
  attribute: 'fire/water/light/dark/primitive/none',
  cost: 2,
  type: 'monster/magic/field',
  attack: 1000,  // monsters only
  hp: 1000,      // monsters only
  category: '【Category】',
  effect: 'Effect description',
  flavor: 'Flavor text',
  keyword: '【Keyword】' // optional
}
```

**To add a new game phase**:
1. Add to `PHASES` array (line ~67)
2. Add case in `processPhase()` switch statement
3. Update phase transition logic in `nextPhase()`

**To implement card effects**:
- Most effects are currently simplified/placeholder
- Check for effect keywords in `summonCard()` (line ~810)
- Implement logic conditionally based on card name or effect text

---

## Development Workflow

### Available Scripts

```bash
npm start      # Run dev server (http://localhost:3000)
npm test       # Run test suite in watch mode
npm run build  # Create production build
npm run eject  # Eject from CRA (⚠️ irreversible)
```

### Testing Strategy

**Current state**: Basic tests in `App.test.js`

**To add game tests**:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import MagicSpiritGame from './magic-spirit';

test('game initializes correctly', () => {
  render(<MagicSpiritGame />);
  expect(screen.getByText(/Magic Spirit/i)).toBeInTheDocument();
});
```

**Testing considerations**:
- Test game state transitions
- Test card summoning with SP costs
- Test combat calculations
- Test win conditions
- Mock random deck generation for consistency

### Code Style Conventions

1. **Japanese in UI**: Game text uses Japanese (cards, phases, UI labels)
2. **English in code**: Variables, functions, comments mostly in English
3. **Component organization**: Large components with inline sub-components
4. **State management**: React hooks only, no external state library
5. **Naming**: camelCase for functions, PascalCase for components
6. **Comments**: Section headers with `// ========` separators

### Performance Considerations

1. **`useCallback`** used for functions that trigger re-renders (e.g., `addLog`, `processPhase`)
2. **Card uniqueId**: Each card gets unique ID to prevent React key collisions
3. **Immutable updates**: Always create new arrays/objects for state updates
4. **Memoization opportunity**: Consider React.memo for Card/FieldMonster components if performance issues arise

---

## Git Workflow

### Branch Strategy

⚠️ **IMPORTANT**: Always work on branches starting with `claude/`

Current development branch: `claude/claude-md-miefgtk5g6c064bt-01N9b6jLa9AE2zYJtbAD4dWD`

### Commit Guidelines

**Commit message style**: Based on repo history, accepts both English and Japanese
- Recent commit: "マジックスピリット適用" (Japanese)
- Original commit: "Initialize project using Create React App" (English)

**Good commit examples**:
```
Add new card attribute system
Fix SP token calculation bug
Implement field card effects
カードバランス調整
新しいモンスター追加
```

### Before Pushing

1. Ensure code runs without errors: `npm start`
2. Run tests: `npm test`
3. Check for console warnings
4. Verify game logic works for both players
5. Test on main game flow: title → playing → game over

### Push Protocol

```bash
# Always use -u flag on first push
git push -u origin claude/[branch-name]

# Retry on network errors with exponential backoff
# (2s, 4s, 8s, 16s delays)
```

---

## Common Tasks & Patterns

### Task: Add a New Monster Card

1. **Define card data** in `SAMPLE_CARDS` (line ~6)
2. **Implement effect** in `summonCard()` if needed (line ~767)
3. **Test summoning** with correct SP cost
4. **Test combat** if monster has special combat rules

### Task: Modify Game Rules

1. **Update constants** (e.g., `INITIAL_LIFE`, `MAX_SP`)
2. **Find relevant function** (phase processing, combat, etc.)
3. **Update logic** with immutable state patterns
4. **Add logging** with `addLog()` for visibility
5. **Test edge cases** (deck empty, max HP, etc.)

### Task: Improve UI/Styling

1. **Locate style object** in `styles` constant (line ~123)
2. **Update inline styles** on components
3. **Consider responsive design** (currently designed for desktop)
4. **Test visual feedback** (hover, click, animations)
5. **Maintain consistent color scheme** with `ATTRIBUTE_COLORS`

### Task: Add Card Effects

**Pattern for on-summon effects**:
```javascript
// In summonCard() after placing monster
if (card.effect && card.effect.includes('召喚時')) {
  addLog(`${card.name}の召喚時効果発動！`, 'info');
  // Implement effect logic here
  if (card.name === 'Specific Card') {
    // Direct implementation
  }
}
```

**Pattern for continuous effects**:
- Add to `processPhase()` at appropriate phase
- Check field for monsters with specific effects
- Apply modifications to game state

### Task: Debug Game State

**Useful debugging locations**:
```javascript
// Log current state in processPhase (line ~705)
console.log('Player:', currentPlayer, 'Phase:', phase);

// Log combat details in attack() (line ~867)
console.log('Attacker:', attacker, 'Target:', target);

// Check SP before summon in summonCard() (line ~768)
console.log('Active SP:', activeSP, 'Cost:', card.cost);
```

**React DevTools**: Use React DevTools to inspect hooks and state

---

## Known Limitations & Future Improvements

### Current Limitations

1. **Card effects**: Many are simplified or not fully implemented
2. **AI opponent**: No computer opponent, requires 2 human players
3. **Deck building**: Decks are randomly generated, no customization
4. **Multiplayer**: Local only, no online play
5. **Mobile support**: Designed for desktop, may not work well on mobile
6. **Animations**: Limited visual effects for actions
7. **Sound**: No audio feedback

### Potential Improvements

1. **Separate card data**: Move `SAMPLE_CARDS` to JSON file
2. **Effect system**: Create plugin system for card effects
3. **State management**: Consider Context API or Redux for complex state
4. **Component splitting**: Break `magic-spirit.jsx` into multiple files
5. **TypeScript**: Add type safety
6. **Backend**: Add server for online multiplayer
7. **Deck builder UI**: Allow custom deck creation
8. **Card images**: Replace placeholder emojis with actual artwork
9. **Animations**: Add GSAP or Framer Motion for smooth transitions
10. **Mobile responsive**: Add mobile-friendly layouts

---

## Troubleshooting

### Common Issues

**Issue**: "SP が足りません" (Not enough SP)
- **Solution**: Check `p1ActiveSP`/`p2ActiveSP` state and card cost
- **Location**: `summonCard()` line ~772

**Issue**: Monster won't attack
- **Solution**: Ensure `canAttack` flag is true and phase is バトル (3)
- **Location**: `attack()` line ~873, `processPhase()` case 0

**Issue**: State not updating
- **Solution**: Ensure immutable updates (spread operator, new arrays)
- **Example**: `setP1Field(prev => [...prev])` not `field[i] = monster`

**Issue**: Card not appearing in hand
- **Solution**: Check deck generation in `createDeck()` and initial hand size
- **Location**: `initGame()` line ~629

**Issue**: Phase not advancing
- **Solution**: Check phase logic in `processPhase()` and auto-advance useEffect
- **Location**: `processPhase()` line ~705, useEffect line ~1019

### Debug Mode

**Add temporary logging**:
```javascript
// At top of component
useEffect(() => {
  console.log('Game State:', {
    turn, currentPlayer, phase,
    p1Life, p2Life,
    p1ActiveSP, p2ActiveSP
  });
}, [turn, currentPlayer, phase, p1Life, p2Life, p1ActiveSP, p2ActiveSP]);
```

---

## Testing Checklist

Before considering a feature complete:

- [ ] Both players can perform the action
- [ ] SP cost is deducted correctly
- [ ] Game log shows appropriate messages
- [ ] State updates are reflected in UI
- [ ] No console errors or warnings
- [ ] Edge cases handled (empty deck, max SP, etc.)
- [ ] Phase transitions work correctly
- [ ] Win/lose conditions trigger properly
- [ ] Can restart game successfully
- [ ] No memory leaks (check DevTools profiler)

---

## Quick Reference

### Important Line Numbers

- Card definitions: **line 6**
- Game constants: **line 60**
- Styles: **line 123**
- Card component: **line 292**
- FieldMonster component: **line 415**
- Main game component: **line 582**
- Game initialization: **line 624**
- Phase processing: **line 705**
- Summon logic: **line 767**
- Attack logic: **line 867**

### State Setters Quick Map

```javascript
P1: setP1Life, setP1Deck, setP1Hand, setP1Field, setP1Graveyard
    setP1ActiveSP, setP1RestedSP, setP1FieldCard

P2: setP2Life, setP2Deck, setP2Hand, setP2Field, setP2Graveyard
    setP2ActiveSP, setP2RestedSP, setP2FieldCard

Game: setTurn, setCurrentPlayer, setPhase, setGameState, setWinner
UI: setSelectedHandCard, setSelectedFieldMonster, setAttackingMonster
```

### Key Patterns

**Getting current player data**:
```javascript
const player = getCurrentPlayerData();
player.setLife(...);
```

**Adding game log**:
```javascript
addLog('Message here', 'info'); // 'info', 'damage', 'heal'
```

**Checking phase**:
```javascript
if (phase === 2) // Main phase
if (phase === 3) // Battle phase
```

---

## AI Assistant Best Practices

When working on this codebase:

1. **Always check current player**: Many bugs arise from wrong player state access
2. **Use immutable updates**: Never mutate state directly
3. **Test both players**: Code should work for both P1 and P2
4. **Preserve game flow**: Don't break phase transitions
5. **Japanese UI text**: Keep UI strings in Japanese for consistency
6. **Log changes**: Use `addLog()` for player visibility
7. **Consider balance**: Card changes should maintain game balance
8. **Performance**: Large state objects, be mindful of re-renders
9. **Unique IDs**: Use `uniqueId` not `id` for React keys
10. **Read before edit**: Understand context before modifying logic

### When Suggesting Changes

- Explain impact on game balance
- Consider both players' perspective
- Note any breaking changes
- Suggest testing approach
- Consider mobile compatibility
- Maintain code style consistency

---

## Resources & References

- **React Docs**: https://react.dev
- **Create React App**: https://create-react-app.dev
- **React Testing Library**: https://testing-library.com/react
- **React Hooks**: https://react.dev/reference/react/hooks

---

## Project Vision & Context

This appears to be a prototype/learning project for a digital card game. The game mechanics are inspired by trading card games with SP resource system similar to mana in Magic: The Gathering or energy in other TCGs.

The Japanese text throughout suggests this may be for a Japanese audience or is being developed by Japanese speakers.

**Key design decisions**:
- Single-file component keeps all logic together (good for prototype)
- Inline styles avoid CSS file management complexity
- Local multiplayer simplifies initial implementation
- React hooks provide clean state management without boilerplate

This is suitable for expansion into a full game or as a learning project for React and game development concepts.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**For**: Magic Spirit (magiSp) Repository
**Branch**: claude/claude-md-miefgtk5g6c064bt-01N9b6jLa9AE2zYJtbAD4dWD
