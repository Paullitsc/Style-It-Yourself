# Chrome Web Store submission

Everything to paste into the Chrome Web Store Developer Dashboard when
publishing the extension. Upload `siy-extension.zip` (built from the
production config, localhost entries stripped).

## Basics

- **Item name:** Style It Yourself
- **Category:** Shopping
- **Language:** English (United States)
- **Visibility:** Unlisted (installable by link, not searchable). Flip to
  Public later from the same screen.

## Summary (short description, 132 char max)

Capture products from any store and add them to, or match them against, your Style It Yourself closet.

## Detailed description

Style It Yourself turns any product page into a piece of your closet.

When you find something you like while shopping, open the extension and it
reads the item on the page: the image, the title, the brand, and the price.
From there you can do one of two things.

Add it to your closet. The piece is saved to your Style It Yourself account
with its color and details, ready to build outfits around.

Or match it against what you already own. The extension checks the item
against your closet and shows you what it pairs with, using the same color
theory and compatibility scoring the app uses, so you know whether it earns
its place before you buy.

You stay in control the whole time. The extension only reads a page when you
ask it to, and it only talks to Style It Yourself. Sign in once and it keeps
you connected.

You will need a free Style It Yourself account at https://styleityourself.ca

## Single purpose

Capture a clothing product from the page the user is viewing and either save
it to their Style It Yourself closet or match it against the items already in
that closet.

## Permission justifications

Paste one per permission in the dashboard's permission-justification fields.

- **activeTab:** Reads the product page the user is actively viewing, and only
  when they open the extension and choose to capture, so it can extract the
  item's image, title, brand, and price.
- **scripting:** Injects a one-time content script into the active tab to read
  those product details when the user captures a piece. Nothing runs until the
  user acts.
- **storage:** Stores the user's Style It Yourself login session locally
  (chrome.storage.local) so they stay signed in between uses.
- **Host permission `https://api.styleityourself.ca/*`:** The extension sends
  captured product data and closet requests to the Style It Yourself backend
  API and receives the results. This is the only server it contacts.

Note on `externally_connectable`: the extension accepts a login session only
from `styleityourself.ca`, so the web app can hand it a signed-in session
after the user clicks Connect. It does not expose anything to other sites.

## Privacy practices (data disclosures)

**Privacy policy URL:** https://styleityourself.ca/privacy

**Data the extension collects:**
- Authentication information: the user's Style It Yourself login session,
  stored locally to keep them signed in.
- Website content: the product details (image, title, brand, price, page URL)
  from the specific page the user chooses to capture, sent to the Style It
  Yourself backend to save or match the item.

**Data the extension does NOT collect:** browsing history, location, personal
communications, financial or payment information, health information, or
keystroke/activity tracking.

**Required certifications (all true, check each):**
- I do not sell or transfer user data to third parties outside the approved
  use cases.
- I do not use or transfer user data for purposes unrelated to the item's
  single purpose.
- I do not use or transfer user data to determine creditworthiness or for
  lending purposes.

## Assets checklist

- [x] Store icon 128x128 (`icons/icon-128.png`, in the zip)
- [ ] At least one screenshot, 1280x800 or 640x400 (capture the popup on a
      real product page)
- [ ] Small promo tile 440x280 (optional but recommended)
- [x] Privacy policy hosted at https://styleityourself.ca/privacy

## After it is approved

1. Copy the assigned extension ID from the dashboard.
2. Backend: set `CORS_ORIGIN_REGEX=chrome-extension://<id>` and redeploy Cloud
   Run (see DEPLOYMENT.md section 6).
3. Frontend: set `NEXT_PUBLIC_SIY_EXTENSION_ID=<id>` in Vercel and redeploy, so
   the `/extension/connect` handshake accepts the published extension.
