const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');

// JSON parsing handling for GitHub Secrets
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error("Firebase Service Account JSON পার্স করতে সমস্যা হয়েছে! সিক্রেট কি চেক করুন।");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function scrapeGovContacts() {
  try {
    console.log("ডাটা স্ক্র্যাপিং শুরু হচ্ছে...");
    const url = 'https://bangladesh.gov.bd/site/view/all_hotlines'; 
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(data);
    
    let contacts = [];

    $('.hotline-item, tr').each((i, elem) => {
      const name = $(elem).find('.title, td:nth-child(1)').text().trim();
      const phone = $(elem).find('.number, td:nth-child(2)').text().trim();
      
      if (name && phone) {
        contacts.push({
          name: name,
          phone: phone,
          category: "govt",
          updatedAt: new Date().toISOString()
        });
      }
    });

    if (contacts.length === 0) {
      console.log("কোনো ডাটা পাওয়া যায়নি অথবা সাইটের লেআউট ভিন্ন।");
      return;
    }

    const batch = db.batch();
    contacts.forEach(contact => {
      const docRef = db.collection('emergency_contacts').doc();
      batch.set(docRef, contact, { merge: true });
    });

    await batch.commit();
    console.log(`সফলভাবে ${contacts.length} টি কন্টাক্ট ক্লাউড ডাটাবেসে সেভ করা হয়েছে!`);

  } catch (error) {
    console.error("অটো-স্ক্র্যাপিংয়ে ত্রুটি:", error.message);
    process.exit(1);
  }
}

scrapeGovContacts();
