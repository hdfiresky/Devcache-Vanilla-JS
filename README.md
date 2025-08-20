# API Cache DevTool

A lightweight browser extension for Chrome and Edge designed to accelerate frontend development by caching API requests on `localhost`.

![API Cache DevTool Popup](https://i.imgur.com/gK9tH1Y.png)

## The Problem

When developing a frontend application (like a React, Vue, or Angular app) on your local machine, you often rely on a backend API for data. Every time you save a file and your app hot-reloads, it re-fetches all the necessary data. This can introduce significant delays, especially if the API is slow or you're fetching a lot of data. Waiting for API calls to complete during every single reload breaks your development flow and slows you down.

While browser devtools offer features like "Override content," they can be cumbersome to set up and manage for multiple API endpoints.

## The Solution

**API Cache DevTool** solves this by intercepting and caching API calls made via `fetch` or `axios` from your local development environment. Once a request is made and a successful response is received, it's stored locally. On the next page reload, the extension serves the response directly from the cache, eliminating network latency entirely.

This means faster reloads, a smoother development experience, and less waiting.

## Features

- **One-Click Caching:** Easily enable or disable caching with a simple toggle switch.
- **`fetch` and `axios` Support:** Automatically intercepts and caches requests made with both the native Fetch API and the popular Axios library.
- **Intelligent Caching:** Caches successful requests (`GET`, `POST`, `PUT`, etc.). The cache key includes the method, URL, and request body to avoid collisions.
- **View Cached Requests:** The popup UI displays a list of all currently cached API endpoints.
- **Clear Cache:** A dedicated button allows you to instantly clear all cached data and start fresh.
- **Zero Configuration:** Works out of the box for any web application running on any local server (`localhost`, `127.0.0.1`, etc.).
- **Cross-Browser:** Fully compatible with both Google Chrome and Microsoft Edge.

## Installation (for local development)

Since this is an unpacked extension, you need to load it manually in your browser's developer mode.

1.  **Download the Code:** Clone this repository or download it as a ZIP file and unzip it.
2.  **Navigate to Extensions:**
    -   In **Chrome**, go to `chrome://extensions`.
    -   In **Edge**, go to `edge://extensions`.
3.  **Enable Developer Mode:** Find the "Developer mode" toggle in the top-right corner and turn it on.
4.  **Load the Extension:**
    -   Click the **"Load unpacked"** button.
    -   Select the folder where you downloaded the extension's code (the folder containing `manifest.json`).
5.  **Pin the Extension (Recommended):** Click the puzzle piece icon in your browser's toolbar and pin the "API Cache DevTool" for easy access.

## How to Use

1.  **Start your local development server** for your web application (e.g., `npm start`).
2.  **Open the extension popup** by clicking on its icon in the toolbar.
3.  **Activate Caching:** Click the "Active" toggle to turn it on.
4.  **Load Your App:** Refresh your web application. The first time, the extension will make the actual API calls and store the responses. You will see console logs like `[API Cache] Caching new response for...`.
5.  **Experience the Speed:** Refresh your application again. This time, the API responses will be served instantly from the cache. The console will show logs like `[API Cache] Serving from cache...`. Your application should load significantly faster.
6.  **Manage the Cache:** Open the popup anytime to see what's been cached or to clear everything using the **"Clear All Cache"** button.

---

This tool is intended for **development purposes only** and should not be used in a production environment.