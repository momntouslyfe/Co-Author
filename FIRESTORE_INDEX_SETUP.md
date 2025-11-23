# 🔥 Easy Firestore Index Setup (No Command Line!)

## Simple Steps - Just Click Through Firebase Console

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your Co-Author Pro project
3. Click on **Firestore Database** in the left menu
4. Click on the **Indexes** tab at the top

### Step 2: Create Index #1 - Addon Credit Plans (Type + Active + Price)
Click **"Create Index"** button and enter:
- **Collection ID**: `addonCreditPlans`
- **Fields to index**:
  1. Field: `type` | Order: **Ascending**
  2. Field: `isActive` | Order: **Ascending**  
  3. Field: `price` | Order: **Ascending**
- **Query Scope**: Collection
- Click **Create**

### Step 3: Create Index #2 - Addon Credit Plans (Type + Created Date)
Click **"Create Index"** button again and enter:
- **Collection ID**: `addonCreditPlans`
- **Fields to index**:
  1. Field: `type` | Order: **Ascending**
  2. Field: `createdAt` | Order: **Descending**
- **Query Scope**: Collection
- Click **Create**

### Step 4: Create Index #3 - Addon Credit Plans (Active + Price)
Click **"Create Index"** button again and enter:
- **Collection ID**: `addonCreditPlans`
- **Fields to index**:
  1. Field: `isActive` | Order: **Ascending**
  2. Field: `price` | Order: **Ascending**
- **Query Scope**: Collection
- Click **Create**

### Step 5: Create Index #4 - Subscription Plans (Active + Price)
Click **"Create Index"** button again and enter:
- **Collection ID**: `subscriptionPlans`
- **Fields to index**:
  1. Field: `isActive` | Order: **Ascending**
  2. Field: `price` | Order: **Ascending**
- **Query Scope**: Collection
- Click **Create**

---

## ⏱️ Wait for Indexes to Build

After creating all 4 indexes:
- Firebase will show "Building..." next to each index
- This usually takes 1-5 minutes
- Once they show a green checkmark ✅, they're ready!
- Your credit purchase page will now work properly

---

## ✅ That's It!

No command line, no coding - just point and click in the Firebase Console!
