// Native fetch is available in Node 18+

const API_URL = 'https://grantify.help/api';

async function testTestimonialSave() {
  console.log("Testing Testimonial Save to " + API_URL);

  // 1. Fetch current Testimonials
  let currentItems = [];
  try {
    const res = await fetch(`${API_URL}/testimonials`);
    currentItems = await res.json();
    console.log(`Current Testimonials Count: ${currentItems.length}`);
  } catch (e) {
    console.error("Fetch failed:", e);
    return;
  }

  // 2. Add a Test Testimonial
  const testId = Date.now().toString();
  const testItem = {
    id: testId,
    name: 'Test User ' + testId,
    image: 'https://via.placeholder.com/150',
    amount: 999999,
    content: 'This is a test testimonial to verify saving functionality.',
    likes: 0,
    loves: 0,
    claps: 0,
    date: '2025-12-25',
    status: 'Test'
  };

  const newItems = [testItem, ...currentItems]; // Add to top

  console.log("Attempting to save " + newItems.length + " items...");

  // 3. Save
  try {
    const res = await fetch(`${API_URL}/testimonials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItems)
    });
    
    const result = await res.json();
    console.log("Save Result:", result);
    
    if (result.success) {
      console.log("✅ Save successful! Checking validation...");
      
      // 4. Verify Persistence
      const res2 = await fetch(`${API_URL}/testimonials`);
      const updatedItems = await res2.json();
      
      const found = updatedItems.find(i => i.id === testId);
      
      if (found) {
        console.log("✅ Persistence confirmed! Found test testimonial: " + found.name);
      } else {
        console.error("❌ Persistence failed. Test item not found in read-back.");
      }

    } else {
      console.error("❌ Save failed via API.");
    }

  } catch (e) {
    console.error("Save Request Error:", e);
  }
}

testTestimonialSave();
