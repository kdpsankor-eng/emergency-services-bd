const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function scrapeGovContacts() {
  try {
    console.log("ডাটা স্ক্র্যাপিং শুরু হচ্ছে...");
    const url = 'https://bangladesh.gov.bd/site/view/all_hotlines'; 
    const { data } = await axios.get(url);
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
          division: "ঢাকা",
          district: "কিশোরগঞ্জ",
          upazila: "কিশোরগঞ্জ সদর",
          updatedAt: new Date().toISOString()
        });
      }
    });

    const batch = db.batch();
    contacts.forEach(contact => {
      const docRef = db.collection('emergency_contacts').doc();
      batch.set(docRef, contact, { merge: true });
    });

    await batch.commit();
    console.log("সব তথ্য সফলভাবে ক্লাউড ডাটাবেসে আপডেট করা হয়েছে!");

  } catch (error) {
    console.error("অটো-স্ক্র্যাপিংয়ে ত্রুটি:", error);
  }
}

scrapeGovContacts();
