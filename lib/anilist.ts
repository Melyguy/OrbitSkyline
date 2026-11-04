fetch("https://graphql.anilist.co/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  body: JSON.stringify({
    query: `
      query {
        Page(page: 1, perPage: 10) {
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
            }
          }
        }
      }
    `,
  }),
})
.then((response) => {
  console.log("HTTP status:", response.status);
  return response.json();
})
.then((data) => {
  console.log("Full API response:", data);
})
.catch((error) => {
  console.error("Fetch error:", error);
});