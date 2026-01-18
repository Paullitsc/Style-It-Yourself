## Golden Path 1: Piece-first styling + single try-on

**Scenario:** Beginner has a navy blazer screenshot and wants a full smart-casual outfit for a date.  

1. **Landing → choose flow**  
   - User lands on home page.  
   - Clicks primary CTA: **“Style an item I have”**.  

2. **Upload initial piece**  
   - Drag-drops navy blazer screenshot.  
   - System extracts dominant color (navy) and shows a swatch.  
   - User confirms or tweaks via a simple color picker.  

3. **Describe the item**  
   - Category Level 1: **Tops** → Level 2: **Blazers**.  
   - Formality tag: **Smart Casual**.  
   - Aesthetic tags: **Classic**.  
   - (Can add other tags)
   - Ownership: **Owned** or **Wishlist** (for context only; no storage beyond this session).  

4. **Outfit builder – categories page**  
   - System opens a single “Outfit Builder” screen showing:  
     - Item cards for: Top (filled), Bottom, Shoes, Accessories, Outerwear.  
     - A horizontal nav: **Tops, Bottoms, Shoes, Accessories, Outerwear, Full Body**.  
   - Under **Bottoms**, a recommendation card appears:  
     - Colors: beige, light gray, off-white (harmonious with navy).  
     - Style: **Casual → Smart Casual**.  
     - Example: “Slim beige chinos, smart-casual style.”  

5. **User adds a bottom**  
   - User clicks “Add” on Bottoms → uploads beige chino screenshot.  
   - System extracts color and default category (**Bottoms → Chinos**).  
   - It checks:  
     - Color in recommended range → “Good match” badge.  
     - Formality distance ≤ 1 → “Style compatible.”  
   - If mismatch (e.g., joggers), system shows:  
     - “Color OK, style mismatch: joggers are much more casual than the blazer. Continue anyway?”  

6. **User adds shoes**  
   - User clicks **Shoes** tab.  
   - Recommendation card: “Brown leather loafers – neutral color, smart-casual.”  
   - User uploads shoe screenshot: algorithm validates category pairing (loafers ↔ chinos/blazer) and formality.  

7. **Review outfit summary (no saving)**  
   - A summary panel shows:  
     - Top: Navy blazer (Smart Casual, Classic).  
     - Bottom: Beige chinos (Smart Casual).  
     - Shoes: Brown loafers (Smart Casual).
     - Potential data showing confidence percent.
     - A visual color strip showing navy → beige → brown harmony.  
   - Incompatibilities (if any) are listed with short explanations, but user can still proceed.  

8. **AI Try-On**  
   - CTA: **“Try this outfit on me”**.  
   - If user has not provided a full-body photo in this session:  
     - A modal asks them to upload one.  
     - After upload, system runs pose/body detection and calls AI model.  
   - Loading state with progress; then the result appears inline:  
     - “Here’s how this outfit looks on you.”  
   - No saving; user can download the generated image or just close the session.  

***

## Golden Path 2: "Experimenter" flow (color play)

**Scenario:** Fashion enthusiast wants to experiment with color combinations around one statement piece, not store anything.  

1. **Landing → experimental mode**  
   - User selects **“Play with colors”** or **“Experiment with an item”**.  

2. **Upload statement piece**  
   - User uploads bright green sneakers (Shoes → Sneakers).  
   - System extracts color, tags as **Casual + Streetwear**.  

3. **Color exploration UI**  
   - Instead of building full outfits immediately, the UI focuses on color options:  
     - Shows a color wheel with highlighted harmonious zones (analogous, complementary, triadic).  
     - Lists:  
       - Complementary suggestions (e.g., deep purples).  
       - Neutral “safe” colors (black, white, gray, navy, beige).  

4. **User picks a direction**  
   - User selects “Analogous + Neutrals.”  
   - System suggests:  
     - Bottoms: black or dark gray jeans.  
     - Tops: white or gray tees, or black hoodie.  

5. **Add quick mock outfit**  
   - User clicks “Add top” → uploads white T-shirt.  
   - User clicks “Add bottom” → uploads black jeans.  
   - A quick inline layout shows sneakers + tee + jeans side-by-side with color bars.  

6. **Compatibility score (no persistence)**  
   - System displays a simple score or textual rating:  
     - “High cohesion: casual streetwear look, low contrast except for green pop.”  
   - User can tweak colors (change tee to off-white, jeans to light wash) and see updated rating instantly.  

7. **AI Try-On (optional quick demo)**  
   - User clicks “Try it on me” once they like a combo.  
   - AI generates a preview; user takes a screenshot or downloads.  
   - When they close the session, all data is lost; no closets, no accounts needed.  

***


These paths give you 2 clear cases:  
1) Style an item I have → build full outfit → try it on.  
2) Experiment with color and style → see compatibility → optional try-on.  
