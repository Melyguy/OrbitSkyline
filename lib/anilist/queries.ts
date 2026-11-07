
export const animeFields = `
  id
  format
  title {
    romaji
    english
  }
  episodes
  coverImage {
    extraLarge
    large
    medium
  }
  relations {
    edges {
      relationType
      node {
        id
        type
      }
    }
  }
`;
