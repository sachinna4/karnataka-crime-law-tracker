# 🏛️ Karnataka Crime & Law Tracker
## Explained Simply — No Coding Knowledge Required!

> *"Imagine having a super-fast digital assistant who wakes up at 7:00 AM every morning, reads every newspaper in Karnataka, picks out all the crime stories, sorts them into folders, files them in a secure online vault, and shows them to you on a clean, ad-free screen with a 1-click link to official court records. That is exactly what this project does!"*

---

## 📌 1. The Big Picture: What Problem Does This Solve?

Every day across Karnataka's 31 districts, hundreds of incidents occur — from vehicle theft in Bengaluru to property disputes in Belagavi. 

Normally, if a citizen, lawyer, or researcher wants to know what's happening:
* They have to manually scroll through 10 different newspapers and police bulletins.
* They see distracting ads and clickbait.
* They cannot easily search by district or crime category.
* It is difficult to verify whether a news report actually resulted in an official police case (FIR) or court case (CNR number).

**This system automates the entire process from start to finish.**

---

## 🧩 2. The 5 Main Parts of the System (In Plain English)

Think of this project as a 5-step assembly line:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  1. The News    │ ────► │  2. The AI      │ ────► │  3. The Digital │
│     Collector   │       │     Detective   │       │     Filing Box  │
│  (RSS Feeds)    │       │   (Gemini AI)   │       │   (Supabase DB) │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  5. Official    │ ◄──── │  4. The Glass   │ ◄───────────────────────┘
│     eCourts     │       │     Showcase    │
│  (Verification) │       │ (The Website)   │
└─────────────────┘       └─────────────────┘
```

---

### Part 1: The News Collector 🗞️
* **What it is:** A computer script that acts like a digital delivery person.
* **What it does:** Every morning, it visits Google News, *The Hindu*, *Deccan Herald*, and Karnataka State Police bulletins to gather all newly published reports about incidents in Karnataka.

---

### Part 2: The AI Detective (Google Gemini AI) 🧠
* **What it is:** Google's latest artificial intelligence model (`Gemini 3.1 Flash Lite`).
* **What it does:** It reads every collected article in less than half a second and asks:
  1. *Is this really a crime incident in Karnataka?* (If it's politics, an international story, or sports, it throws it away).
  2. *Which of the 10 official categories does it belong to?* (Murder, Burglary, POCSO, Cybercrime, etc.).
  3. *Which Karnataka district did it happen in?* (e.g. Mysuru, Hubballi-Dharwad, Bengaluru).
  4. *Is there an official Police Station FIR number or Court Case Number (CNR) mentioned?*
  5. *What is the current status?* (FIR Registered, Under Investigation, or Convicted).

---

### Part 3: The Digital Filing Cabinet (Supabase Cloud Database) 🗄️
* **What it is:** A secure, cloud-hosted PostgreSQL database.
* **What it does:**
  * When the AI finishes sorting an incident, it saves it into this filing cabinet.
  * It automatically rejects duplicates so the same news story never appears twice.
  * It stores over 150+ verified cases and keeps expanding every day.

---

### Part 4: The Glass Showcase (The Website You See) 💻
* **What it is:** The live web application you open on your phone or laptop:
  👉 **[https://sachinna4.github.io/karnataka-crime-law-tracker/](https://sachinna4.github.io/karnataka-crime-law-tracker/)**
* **What it does:**
  * Displays the **Category Overview cards** at the top showing official annual tallies for the state.
  * Allows you to click on any category to view the individual case dossiers.
  * Lets you filter by any of Karnataka's 31 districts or type to search by name or case number.
  * Completely clean, fast, and institutional design — no ads, no trackers.

---

### Part 5: The eCourts Verification Bridge (1-Click Verification) ⚖️
* **The challenge:** India's official court website ([services.ecourts.gov.in](https://services.ecourts.gov.in/ecourtindia_v6/)) requires an image CAPTCHA code (the wavy numbers you type to prove you are human). Automated bots cannot and should not bypass this security.
* **Our smart solution:**
  * In the website table, every court case displays its official **16-digit CNR Number** (like `KAHB010024512024`).
  * When you click **"Verify on eCourts ↗"**:
    1. It automatically copies the CNR number to your clipboard.
    2. A friendly popup tells you: *"✓ CNR copied! Opening eCourts portal..."*
    3. The official government eCourts portal opens in a new tab.
    4. You simply paste (`Ctrl + V`) into the **Search by CNR Number** box and hit enter!

---

## ⏰ 3. How Does It Run Every Day Without You Touching It?

You might wonder: *"Do I need to leave my computer on all night for this to work?"*

**Answer: NO!**

* The whole system is hosted on **GitHub Actions** (free cloud computers owned by Microsoft/GitHub).
* Every single morning at **7:00 AM IST**, an automatic timer fires in the cloud.
* GitHub's cloud server starts up, runs the news collector and AI classifier, updates the database, and shuts down — all in about 2 minutes.
* It costs **₹0 / $0**, requires **0 electricity from your home**, and works 365 days a year completely on autopilot.

---

## 📖 4. A Story: Journey of a News Report

To see how everything fits together, follow the journey of this real incident:

1. **8:00 PM (Yesterday):** A local newspaper publishes an article: *"Two arrested for house burglary in Jayanagar, Bengaluru; gold recovered"*.
2. **7:00 AM (Today):** The cloud timer triggers our robot worker.
3. **7:00:15 AM:** The robot finds the article link and hands it to Gemini AI.
4. **7:00:16 AM:** Gemini AI reads it and extracts:
   * **Category:** `Burglary`
   * **District:** `Bengaluru Urban`
   * **FIR:** `Cr. No. 178/2026 - Jayanagar PS`
   * **CNR:** `KABG010098122026`
   * **Status:** `Under Investigation`
5. **7:00:17 AM:** The case is saved into the Supabase cloud database.
6. **7:00:18 AM:** You open the website on your phone. You tap **Burglary** and see the case listed with a direct link to the original article and a 1-click button to check it on eCourts!

---

## ❓ 5. Frequently Asked Questions (FAQ)

### Q: Is this website live for anyone to view?
**Yes!** Anyone with internet access anywhere in the world can open:  
[https://sachinna4.github.io/karnataka-crime-law-tracker/](https://sachinna4.github.io/karnataka-crime-law-tracker/)

### Q: Does this cost any money to run?
**No.** All components use 100% free tiers:
* GitHub Pages (Free hosting)
* GitHub Actions (Free daily runner)
* Supabase (Free database tier)
* Google Gemini API (Free AI tier)

### Q: Are the news source links real?
**Yes.** Every single "View Source ↗" button takes you directly to the full original news report or official police press release (no homepage redirects or dead links).

### Q: What is a CNR Number?
**CNR** stands for **Case Number Record**. It is a unique 16-character alphanumeric code assigned to every case filed in Indian District & Subordinate Courts (e.g. `KAHB010024512024` where `KA` = Karnataka, `HB` = Hubballi, etc.). It allows anyone to look up the exact court hearing dates, orders, and judgment PDFs on the official eCourts website.

---

*Authored for the Karnataka Crime & Law Tracker project.*
