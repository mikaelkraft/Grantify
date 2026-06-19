async function main() {
  const url = "https://grantify.help/api/sponsored?what=pricing";
  try {
    console.log("Fetching live site URL:", url);
    const res = await fetch(url);
    console.log("Response Status:", res.status);
    console.log("Response Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

main();
