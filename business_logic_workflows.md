***

## 1. Global concepts and inputs

At a business-logic level, every flow operates on the same basic objects (in memory, per session):

- **Item:**  
  - Inputs: image, category (L1 + L2), formality tag(s), aesthetic tag(s), ownership, optional brand/price/link.  
  - Derived: dominant color (HEX/HSL), simplified color name (e.g., “navy”), “neutral vs non-neutral” flag.  

- **Context:**  
  - Either **piece-first** (base item) or **theme-first** (event) or **experiment mode** (color focus).  
  - Optional theme: Job Interview, First Date, Wedding Guest, Night Out, Casual Weekend.  

- **Outfit (session-only):**  
  - Up to 6 items, with category slots enforced: 1 top, 1 bottom or 1 full-body, 1 shoes, optional outerwear/accessories.  
  - Compatibility status + explanation.  

***

## 2. Piece-first business logic workflow

**Goal:** Build a coherent outfit around 1 item the user uploads.

### Step A: Establish base item

1. User uploads an item and fills metadata.  
2. System sets this as **Base Item** and computes:  
   - \(baseColor\) (HSL) + “fashion color name”.  
   - \(baseFormalityLevel\) (e.g., Casual=1 … Black Tie=5).  
   - \(baseAesthetics\) (set of tags: Minimalist, Streetwear, etc.).  

3. System labels the user’s **intent**: “complete an outfit around this base item.”  

### Step B: Generate recommendations per category

For each category slot that is still empty (Bottom, Shoes, Accessories, Outerwear):

4. **Color rules:**  
   - Decide a small set of target palette options based on \(baseColor\):  
     - Neutrals that always work (black, white, gray, navy, beige).  
     - A chosen harmony type by default (e.g., analogous + neutrals for beginners).  
   - Output: Recommended color names and example swatches.  

5. **Formality rules:**  
   - Allowed formality band = \([baseFormalityLevel - 1, baseFormalityLevel + 1]\), scale 1–5.  
   - Output: “Target formality: Smart Casual–Business Casual,” etc.  

6. **Aesthetic rules:**  
   - Items that share at least one aesthetic tag with the base are **preferred**.  
   - Output: “Prefer Streetwear or Minimalist pieces for cohesion.”  

7. **Category-pairing rules:**  
   - For each slot, filter to allowed pairings (e.g., Sneakers ↔ Jeans/Joggers/Shorts/Chinos; Oxfords ↔ Dress Pants/Suits).  
   - Output: Example description: “Brown leather loafers that go with chinos or dress pants.”  

The UI shows these recommendations as “what to look for” before the user uploads anything for that slot.  

### Step C: Validate each added item

When user uploads/selects a piece for a slot:

8. System computes new item’s color, formality, aesthetics, and category.  

9. Business logic evaluates **compatibility** against the base item and current outfit:

- **Color compatibility:**  
  - If item color is in recommended palette → status: Color OK.  
  - Else if item color is neutral → Color OK (neutral override).  
  - Else → Color Warning (“Color is outside the recommended range; still allowed”).  

- **Formality compatibility:**  
  - Compute distance \(|itemFormality - baseFormality|\).  
  - If distance <= 1 → Style OK.  
  - If 2 → Warning (“Slightly off formality”).  
  - If >= 3 → Mismatch (“Very different formality; may look odd”).  

- **Aesthetic compatibility:**  
  - If intersection(\(itemAesthetics\), \(baseAesthetics\)) is non-empty → Cohesive.  
  - Else -> “Mixed aesthetics” warning (e.g., Streetwear vs Preppy).  

- **Category pairing:**  
  - If (itemCategory, baseCategory) in defined allowed pairs → OK.  
  - Else → “Unusual pairing” warning (e.g., heels + joggers).  

10. The item is **always allowed** to join the outfit, but each rule adds tags:  
    - `compatible`, `soft-warning`, or `hard-warning`.  
    - A short explanation is attached per warning.  

### Step D: Outfit-level summary

Once required slots are filled:

11. System evaluates the **entire outfit**:

- Check composition rules: required categories present, max items not exceeded.  
- Compute an overall “cohesion score” or textual verdict from:  
  - Average formality distance across items.  
  - % of items sharing at least one aesthetic tag with base.  
  - % of items whose colors are in recommended palettes or neutrals.  

12. Output presented to user:  
- “Outfit passes core rules: smart-casual cohesive look.”  
- List of any warnings (with clear reasons) to educate, not block.  

***

## 3. Theme-first business logic workflow

**Goal:** Use event rules to drive recommendations instead of a base item.

### Step A: Establish theme constraints

1. User selects theme (e.g., Wedding Guest).  
2. System loads a theme profile:  
   - Allowed formality band (e.g., Formal–Semi-Formal).  
   - Encouraged/blocked colors (e.g., avoid white/cream).  
   - Suggested aesthetics (e.g., Classic, Elegant, maybe Minimalist).  

3. Theme becomes the **primary context** instead of a base item.  

### Step B: Guide user to seed item (can be optional)

4. System asks: “Do you have a starting piece?”  
   - If **yes**, treat it as a base item with theme constraints layered on top.  
   - If **no**, system generates archetypal suggestions (e.g., “long dress in jewel tones” for Wedding Guest) but still expects user to upload items later.  

### Step C: Apply theme rules to recommendations and validation

5. All category recommendations must satisfy:  
   - Formality is in theme’s allowed band.  
   - Colors is in theme palette, minus banned colors.  
   - Aesthetics ∩ theme aesthetics != null if possible.  

6. When user uploads items:  
   - Same color/formality/aesthetic checks as piece-first.  
   - Additional theme-specific checks:  
     - If item color in banned list → “Not appropriate for this event” warning.  
     - If formality below theme’s minimum → “Too casual for X theme.”  

7. Outfit summary now includes:  
   - “This outfit fits the ‘Wedding Guest’ guidelines.” or  
   - “This outfit is slightly under-formal for ‘Job Interview’ (see shoes).”  

The theme acts like a **global rule-set** on top of item-level logic.  

***

## 4. Experiment / color-play business logic workflow

**Goal:** Let users learn what colors and aesthetics work together without caring about events or saving outfits.

### Step A: Establish experiment base

1. User uploads one “statement” item (e.g., green sneakers).  
2. System identifies:  
   - Base color and its position on the color wheel.  
   - Base aesthetic (e.g., Streetwear).  

### Step B: Offer harmony modes

3. System presents color modes (Complementary, Analogous, Triadic, Neutrals).  
4. When user selects a mode, system generates:  
   - Recommended color bands.  
   - Suggested categories per band (e.g., “Pair with black jeans and a white tee”).  

### Step C: Evaluate combos in real time

5. As user uploads or tweaks other items:  
   - Apply same color/formality/aesthetic rules, but **no theme** and no base formality constraints.  
   - The primary score is **visual cohesion + aesthetic match** rather than event appropriateness.  

6. System surfaces educational copy:  
   - “This works because the jacket is analogous to your sneakers on the color wheel.”  
   - “High contrast complementary combo; bold streetwear look.”  

Outfit validation focuses on **teaching color logic**, not enforcing dress-code rules.  

***

## 5. Try-on triggering & guardrails (business rules)

Regardless of flow, the try-on feature has its own gating rules:

1. **Preconditions to enable “Try it on me”:**  
   - Required outfit slots filled (Top + Bottom/Full Body + Shoes).  
   - User has provided a full-body photo in this session.  

2. **Soft checks before calling AI:**  
   - If outfit has multiple hard warnings (e.g., big formality clashes), show a note: “This outfit may look unconventional; proceed anyway?”  

3. **Post-generation:**  
   - Show result with a brief recap of why the system thinks the outfit is cohesive or not.  
   - Business rule: never auto-save or auto-share; user must explicitly take action to download or screenshot.  

***

This business-logic workflow gives a clear separation:  

- **Inputs:** Items, themes, and user choices.  
- **Core engines:** Color harmony, formality/aesthetic compatibility, theme constraints.  
- **Outputs:** Category recommendations, warnings, scores, and try-on eligibility.  
