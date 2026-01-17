# SIY-Style-It-Yourself-
You dress like a bum? You got no girls? This app allows you to style like a stylist, leveling up your fashion game and boosting up your aura!

USECASES NEEDED FOR THE HACK: check sequence diagrams 1,4


## DEV SETUP
1. After cloning, cp env.example to .env
2. Checkout to your own branch name/feature_name. Then, Create venv and activate it to avoid commit the whole codebase, then pip install -r requirements.txt
3. Make changes and meaning full commit messages for each file
4. Git push to your own remote branch and make a PR, tag your issue, assign Thai as reviewer:) (do not need to make PR for README.md changes)

## Presentation

- Team/Project Intro/Inspiration ( 30 SECS )
- Upload a piece, see how it looks on user with AI, then build an outfit (with 2 more items) and see whole fit preview ( 2 MINS )
- Challenges we faced, what happen when we scale up ( 2 MINS )
- Optional: save outfit to closet at step 2 and 3, then go to closet and browse all the fits ( 30 SECS OF BUFFER TIME)

## Features

- **Outfit Recommendations**: Get color-coordinated outfit suggestions based on color harmony rules
- **Item Validation**: Check compatibility of clothing items (color, formality, aesthetics)
- **Outfit Validation**: Validate complete outfits with cohesion scoring
- **Closet Management**: Save and retrieve outfits and clothing items
- **AI Try-On**: Generate virtual try-on images (requires Gemini API)

## Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT)
- **Storage**: Supabase Storage
- **AI**: Google Gemini API
