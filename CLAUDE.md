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
Currently a **prototype version** with local 2-player gameplay.

**Recent Major Update (2025-11-26)**:
- Code refactoring completed (Phase 1-4)
- 2237 lines → 1366 lines (39% reduction)
- Modular architecture with separated concerns

---

## Directory Structure

```
/home/user/magiSp/
├── public/                     # Static assets
│   ├── index.html              # HTML entry point
│   ├── cardlist/
│   │   └── cardlist.csv        # 433 cards data
│   ├── manifest.json           # PWA manifest
│   └── *.png, *.ico            # Icons and images
│
├── src/
│   ├── App.js                  # Main app component (renders MagicSpiritGame)
│   ├── magic-spirit.jsx        # Main game logic (1366 lines) ⭐
│   │
│   ├── utils/                  # Utility functions
│   │   ├── constants.js        # Game constants (32 lines)
│   │   ├── helpers.js          # Helper functions (64 lines)
│   │   └── cardManager.js      # Card data management (240 lines)
│   │
│   ├── components/             # UI Components
│   │   ├── Card.jsx            # Card display (195 lines)
│   │   ├── FieldMonster.jsx    # Field monster display (166 lines)
│   │   ├── SPTokens.jsx        # SP token display (38 lines)
│   │   └── GameLog.jsx         # Game log display (20 lines)
│   │
│   ├── styles/                 # Style definitions
│   │   └── gameStyles.js       # Game styles (165 lines)
│   │
│   ├── engine/                 # Game logic engines
│   │   └── effectEngine.js     # Effect execution engine (220 lines) ⭐
│   │
│   ├── ルール/                  # Documentation
│   │   ├── magic-spirit-roadmap-updated.txt
│   │   └── code-structure.md   # Detailed code structure guide
│   │
│   ├── index.js                # React entry point
│   ├── App.css                 # App styling
│   ├── index.css               # Global styles
│   ├── setupTests.js           # Test configuration
│   ├── App.test.js             # App tests
│   └── reportWebVitals.js      # Performance monitoring
│
├── package.json                # Dependencies and scripts
├── CLAUDE.md                   # This file - AI developer guide
└── README.md                   # Standard CRA documentation
```

### Key Files

**`src/magic-spirit.jsx`** (Main game component - 1366 lines)
- Game state management (React hooks)
- Game flow control (phase progression, turn management)
- Card summoning logic
- Battle system
- Skill execution
- UI rendering

**`src/engine/effectEngine.js`** (Effect engine - 220 lines) ⭐ **Most Important**
- Effect type definitions (13 types)
- Effect text parser
- Effect execution system
- Foundation for expanding card effects

**`src/utils/cardManager.js`** (Card data manager - 240 lines)
- CSV parser for 433 cards
- Skill information extraction
- Async card loading from CSV
- Fallback sample cards

**`src/components/`** (UI components - 4 files, 419 lines total)
- Separated UI components for better maintainability
- Independent, reusable components

**`src/utils/constants.js`** (Game constants - 32 lines)
- All game constants in one place
- Easy to adjust game balance

**`package.json`**
- React 19.2.0 (latest)
- Testing libraries included
- Standard CRA scripts

**See also**: `src/ルール/code-structure.md` for detailed architecture documentation

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

**Main Game Logic**: Located in `src/magic-spirit.jsx` (1366 lines)
**Effect System**: Located in `src/engine/effectEngine.js` (220 lines)
**Card Management**: Located in `src/utils/cardManager.js` (240 lines)

**Key Functions in magic-spirit.jsx**:

1. **`initGame()`**: Initialize/reset game state
2. **`processPhase(phaseIndex)`**: Handle phase transitions
3. **`summonCard(card, slotIndex)`**: Place cards on field
4. **`attack(attackerIndex, targetIndex)`**: Combat resolution
5. **`executeSkill(monsterIndex, skillType)`**: Execute monster skills (uses effectEngine)
6. **`getCurrentPlayerData()`**: Get active player state
7. **`getOpponentData()`**: Get opponent state

**Key Functions in effectEngine.js**:

1. **`parseEffect(effectText)`**: Parse effect text into effect objects
2. **`executeEffect(effect, context)`**: Execute single effect
3. **`executeSkillEffects(skillText, context)`**: Execute all effects in skill text

**Important Constants** (in `src/utils/constants.js`):
```javascript
INITIAL_LIFE = 6000
INITIAL_SP = 1
MAX_SP = 10
INITIAL_HAND_SIZE = 5
DECK_SIZE = 40
COUNTER_ATTACK_RATE = 0.3
PHASES = ['ターン開始', 'ドロー', 'メイン', 'バトル', 'エンド']
ATTRIBUTE_COLORS = { '炎': {...}, '水': {...}, ... }
TYPE_ICONS = { 'monster': '⚔️', 'magic': '✨', ... }
```

### Working with the Effect Engine ⭐

The effect engine (`src/engine/effectEngine.js`) is the foundation for card effects. Understanding this is crucial for implementing new cards.

**Effect Flow**:
1. Card effect text → `parseEffect()` → Effect objects
2. Effect objects → `executeEffect()` → Game state changes
3. Full skill text → `executeSkillEffects()` → All effects executed

**Currently Implemented Effects**:
- ✅ DAMAGE: Direct damage to opponent
- ✅ HEAL: Restore life to self
- ⚠️ BUFF_ATK, BUFF_HP: Planned (returns false)
- ⚠️ DEBUFF_ATK: Planned (returns false)
- ⚠️ DOUBLE_ATTACK, DRAW: Planned (returns false)
- ⚠️ SEARCH, REVIVE, DESTROY: Planned (returns false)

**Adding a New Effect**:
```javascript
// Step 1: Add to EFFECT_TYPES
export const EFFECT_TYPES = {
  // ...existing types
  YOUR_EFFECT: 'your_effect',
};

// Step 2: Add parsing pattern in parseEffect()
const yourEffectMatch = effectText.match(/your_pattern/);
if (yourEffectMatch) {
  effects.push({
    type: EFFECT_TYPES.YOUR_EFFECT,
    value: /* extracted value */,
    target: /* target */,
  });
}

// Step 3: Add execution in executeEffect()
case EFFECT_TYPES.YOUR_EFFECT:
  const { currentPlayer, setP1Life, addLog } = context;
  // Implement effect logic
  addLog(`Effect message`, 'info');
  return true;
```

**Effect Context Object**:
```javascript
const context = {
  currentPlayer,      // 1 or 2
  setP1Life,          // P1 life setter
  setP2Life,          // P2 life setter
  setP1Field,         // P1 field setter
  setP2Field,         // P2 field setter
  addLog,             // Log function (message, type)
};
```

### Component Structure

**Main Component**:
- **`MagicSpiritGame`** (in `src/magic-spirit.jsx`): Root game component with all game state and logic

**UI Components** (in `src/components/`):
1. **`Card.jsx`** (195 lines): Renders individual cards in hand/deck
   - Props: card, onClick, selected, small, faceDown, inHand, disabled
   - Displays cost, name, stats, skills, forbidden markers

2. **`FieldMonster.jsx`** (166 lines): Renders monsters on field
   - Props: monster, onClick, selected, canAttack, isTarget, isValidTarget
   - Features: HP bar, attack indicators, charge counters, skill icons

3. **`SPTokens.jsx`** (38 lines): SP token visualization
   - Props: active, rested, max
   - Displays ◆ (active), ◇ (rested), ○ (empty) tokens

4. **`GameLog.jsx`** (20 lines): Battle log display
   - Props: logs
   - Color-coded messages (damage: red, heal: green, info: gray)

### Styling Approach

- **All styles centralized** in `src/styles/gameStyles.js` (165 lines)
- **Inline styling** using JavaScript objects
- Uses gradients, animations, and CSS-in-JS patterns
- Responsive design with flexbox/grid
- Dark theme with neon accents

**Style Structure**:
```javascript
// src/styles/gameStyles.js exports default styles object
export default {
  container: { ... },
  titleScreen: { ... },
  playerArea: { ... },
  card: { ... },
  cardSlot: { ... },
  spToken: { ... },
  log: { ... },
  // ... and more
};
```

**Color scheme** (defined in `src/utils/constants.js`):
```javascript
ATTRIBUTE_COLORS = {
  '炎': red/orange gradients with #ff6b6b glow
  '水': blue gradients with #6b9eff glow
  '光': gold/yellow gradients with #ffd700 glow
  '闇': purple/dark gradients with #9d4ce6 glow
  '原始': green/earth tones with #6bff6b glow
  'なし': gray gradients
}
```

### Adding New Features

**To add a new card**:
```javascript
// Option 1: Add to CSV file at public/cardlist/cardlist.csv
// (Recommended for production)

// Option 2: Add to SAMPLE_CARDS array in src/utils/cardManager.js
{
  id: 'C0000XXX',
  name: 'Card Name',
  attribute: '炎', // or '水', '光', '闇', '原始', 'なし'
  cost: 2,
  type: 'monster', // or 'magic', 'field'
  attack: 1000,  // monsters only
  hp: 1000,      // monsters only
  category: '【Category】',
  effect: 'Effect description. 基本技: 100ダメージ. 上級技: 200ダメージ',
  flavor: 'Flavor text',
  keyword: '【Keyword】', // optional
  forbidden: false // optional
}
```

**To add a new effect type**:
1. Add to `EFFECT_TYPES` in `src/engine/effectEngine.js`
2. Add parsing logic in `parseEffect()` function
3. Add execution logic in `executeEffect()` switch statement
4. Test with cards that use the new effect

**To add a new game phase**:
1. Add to `PHASES` array in `src/utils/constants.js`
2. Add case in `processPhase()` in `src/magic-spirit.jsx`
3. Update phase transition logic in `nextPhase()`

**To implement card effects**:
- **Simple effects**: Add pattern matching to `parseEffect()` in `src/engine/effectEngine.js`
- **Complex effects**: Implement in `executeEffect()` switch statement
- **Special effects**: Check card properties in `summonCard()` in `src/magic-spirit.jsx`

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

1. **Define card data** in CSV (`public/cardlist/cardlist.csv`) or `SAMPLE_CARDS` (`src/utils/cardManager.js`)
2. **Add effect pattern** to `parseEffect()` in `src/engine/effectEngine.js` if using new effect type
3. **Implement effect** in `executeEffect()` switch statement
4. **Test summoning** with correct SP cost
5. **Test combat** if monster has special combat rules

### Task: Modify Game Rules

1. **Update constants** in `src/utils/constants.js` (e.g., `INITIAL_LIFE`, `MAX_SP`)
2. **Find relevant function** in `src/magic-spirit.jsx` (phase processing, combat, etc.)
3. **Update logic** with immutable state patterns
4. **Add logging** with `addLog()` for visibility
5. **Test edge cases** (deck empty, max HP, etc.)

### Task: Improve UI/Styling

1. **Update styles** in `src/styles/gameStyles.js`
2. **Modify component** in `src/components/` if changing component structure
3. **Update colors** in `ATTRIBUTE_COLORS` in `src/utils/constants.js` if needed
4. **Consider responsive design** (currently designed for desktop)
5. **Test visual feedback** (hover, click, animations)

### Task: Add Card Effects

**Pattern 1: Simple damage/heal effects**:
```javascript
// Add parsing pattern to parseEffect() in src/engine/effectEngine.js
const damageMatch = effectText.match(/(\d+)ダメージ/);
if (damageMatch) {
  effects.push({
    type: EFFECT_TYPES.DAMAGE,
    value: parseInt(damageMatch[1]),
    target: 'opponent',
  });
}
```

**Pattern 2: Complex effects**:
```javascript
// Add to executeEffect() switch in src/engine/effectEngine.js
case EFFECT_TYPES.YOUR_EFFECT:
  const { currentPlayer, setP1Life, addLog } = context;
  // Implement effect logic
  addLog(`Effect executed!`, 'info');
  return true;
```

**Pattern 3: On-summon effects**:
```javascript
// In summonCard() in src/magic-spirit.jsx after placing monster
if (card.effect && card.effect.includes('召喚時')) {
  addLog(`${card.name}の召喚時効果発動！`, 'info');
  executeSkillEffects(card.effect, context);
}
```

**Pattern 4: Continuous effects**:
- Add to `processPhase()` at appropriate phase in `src/magic-spirit.jsx`
- Check field for monsters with specific effects
- Apply modifications to game state

### Task: Debug Game State

**Useful debugging locations**:
```javascript
// In src/magic-spirit.jsx

// Log current state in processPhase()
console.log('Player:', currentPlayer, 'Phase:', phase);

// Log combat details in attack()
console.log('Attacker:', attacker, 'Target:', target);

// Check SP before summon in summonCard()
console.log('Active SP:', activeSP, 'Cost:', card.cost);

// In src/engine/effectEngine.js

// Log effect parsing in parseEffect()
console.log('Parsed effects:', effects);

// Log effect execution in executeEffect()
console.log('Executing effect:', type, value, target);
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

1. ✅ **~~Component splitting~~**: COMPLETED - Refactored into modular architecture
2. ✅ **~~Effect system foundation~~**: COMPLETED - Created effectEngine.js with extensible system
3. **Effect expansion**: Implement remaining effects (buff/debuff, search, revive, destroy)
4. **Card data format**: Convert CSV to JSON for better structure and validation
5. **Effect plugin system**: Make effects more modular and extensible
6. **State management**: Consider Context API or Redux for complex state
7. **TypeScript**: Add type safety to entire codebase
8. **Backend**: Add server for online multiplayer
9. **Deck builder UI**: Allow custom deck creation
10. **Card images**: Replace placeholder emojis with actual artwork
11. **Animations**: Add GSAP or Framer Motion for smooth transitions
12. **Mobile responsive**: Add mobile-friendly layouts
13. **Testing**: Add comprehensive unit and integration tests

---

## Troubleshooting

### Common Issues

**Issue**: "SP が足りません" (Not enough SP)
- **Solution**: Check `p1ActiveSP`/`p2ActiveSP` state and card cost
- **Location**: `summonCard()` in `src/magic-spirit.jsx`

**Issue**: Monster won't attack
- **Solution**: Ensure `canAttack` flag is true and phase is バトル (3)
- **Location**: `attack()` in `src/magic-spirit.jsx`, `processPhase()` case 0

**Issue**: State not updating
- **Solution**: Ensure immutable updates (spread operator, new arrays)
- **Example**: `setP1Field(prev => [...prev])` not `field[i] = monster`

**Issue**: Card not appearing in hand
- **Solution**: Check deck generation in `createDeck()` in `src/utils/helpers.js` and initial hand size
- **Location**: `initGame()` in `src/magic-spirit.jsx`

**Issue**: Phase not advancing
- **Solution**: Check phase logic in `processPhase()` and auto-advance useEffect
- **Location**: `processPhase()` in `src/magic-spirit.jsx`

**Issue**: Effect not working
- **Solution**: Check if effect pattern is matched in `parseEffect()` and implemented in `executeEffect()`
- **Location**: `src/engine/effectEngine.js`

**Issue**: Card data not loading from CSV
- **Solution**: Check console for errors, verify CSV format, check fallback to SAMPLE_CARDS
- **Location**: `loadCardsFromCSV()` in `src/utils/cardManager.js`

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

### Important File Locations

**Game Constants**: `src/utils/constants.js`
- INITIAL_LIFE, INITIAL_SP, MAX_SP, etc.
- PHASES array
- ATTRIBUTE_COLORS
- TYPE_ICONS

**Card Data**: `src/utils/cardManager.js`
- SAMPLE_CARDS (fallback data)
- parseCSV() - CSV parser
- parseSkills() - skill extractor
- loadCardsFromCSV() - async loader

**Helper Functions**: `src/utils/helpers.js`
- shuffle()
- createDeck()
- createMonsterInstance()

**Effect System**: `src/engine/effectEngine.js` ⭐
- EFFECT_TYPES (13 types)
- parseEffect() - effect parser
- executeEffect() - effect executor
- executeSkillEffects() - skill processor

**Styles**: `src/styles/gameStyles.js`
- All style definitions

**Components**: `src/components/`
- Card.jsx - card display
- FieldMonster.jsx - field monster
- SPTokens.jsx - SP visualization
- GameLog.jsx - log display

**Main Game Logic**: `src/magic-spirit.jsx`
- Game state management
- initGame() - initialization
- processPhase() - phase handler
- summonCard() - summoning logic
- attack() - combat logic
- executeSkill() - skill execution

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
- ~~Single-file component~~ → **Modular architecture** (refactored 2025-11-26)
- **Separated concerns**: utils, components, styles, engine modules
- **Effect engine foundation**: Extensible system for card effects
- Inline styles with centralized style objects
- Local multiplayer simplifies initial implementation
- React hooks provide clean state management without boilerplate

**Recent Evolution** (2025-11-26):
- Refactored from 2237-line monolith to modular 9-file architecture
- Created effect execution engine for extensibility
- Separated UI components for reusability
- Centralized constants and styles
- 39% code reduction while improving maintainability

This is suitable for expansion into a full game or as a learning project for React and game development concepts.

---

**Document Version**: 2.0
**Last Updated**: 2025-11-26 (Major update: Refactoring documentation)
**For**: Magic Spirit (magiSp) Repository
**Branch**: claude/plan-code-refactoring-01G9LgvBcjiL2ckZHPm6nxL3
