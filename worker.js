"use strict";
importScripts("book.js");
onmessage = event => {
  try { postMessage({groups:Book.reconcile(event.data)}); }
  catch (error) { postMessage({error:error.message}); }
};
