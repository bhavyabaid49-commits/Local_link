import { dataDirectory, resetFromSeed } from "./store.js";

resetFromSeed();
console.log(
  `Seeded Local Link JSON data in ${dataDirectory}. Test business: koramangala@locallink.demo / LocalLink123!`,
);
