// Native fetch is available in Node 18+

const API_URL = 'https://grantify.help/api';

async function testSave() {
  console.log("Testing Save to " + API_URL);

  // 1. Fetch current Ads
  try {
    const res = await fetch(`${API_URL}/ads`);
    const current = await res.json();
    console.log("Current Header Ad Length:", current.header?.length);
  } catch (e) {
    console.error("Fetch failed:", e);
  }

  // 2. Try to Save Updated Ads (Simulating Admin Update)
  const newContent = `<div style="background:red; color:white; padding:10px;">TEST AD SAVE ${Date.now()}</div>`;
  
  try {
    const res = await fetch(`${API_URL}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        head: '<!-- Test Head -->',
        header: newContent,
        body: newContent,
        sidebar: newContent,
        footer: newContent
      })
    });
    
    const result = await res.json();
    console.log("Save Result:", result);
    
    if (result.success) {
      console.log("✅ Save successful! Checking validation...");
      // Fetch again to confirm persistence
      const res2 = await fetch(`${API_URL}/ads`);
      const updated = await res2.json();
      if (updated.header === newContent) {
        console.log("✅ Persistence confirmed! The API is working correctly.");
      } else {
        console.error("❌ Persistence failed. Read back different data.");
        console.log("Read back:", updated.header);
      }
    } else {
      console.error("❌ Save failed via API.");
    }

  } catch (e) {
    console.error("Save Request Error:", e);
  }
}

testSave();
