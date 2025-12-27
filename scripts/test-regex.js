const regex = /((?!api|ads\.txt|sw\.js).*)/;
const paths = ['/sw.js', '/ads.txt', '/api/users', '/index.html', '/about', '/assets/main.js', 'sw.js'];

paths.forEach(p => {
  const match = p.match(regex);
  const isMatch = match && match[0] === p; // Full match
  console.log(`Path: "${p}" | Matches Rewrite? ${isMatch ? 'YES (Rewrite)' : 'NO (Static)'}`);
});
