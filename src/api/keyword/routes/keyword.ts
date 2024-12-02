export default {
  routes: [
    {
      method: "GET",
      path: "/keyword",
      handler: "keyword.getKeyword",
    },
    {
      method: "GET",
      path: "/get-asset",
      handler: "keyword.getAsset",
    },
  ],
};
