# IITK Year 2021 Yearbook

A web application for exploring and viewing yearbook memoirs from IIT Kanpur's 2021 batch.

## 🌐 Live Website

**Visit the yearbook:** [https://iitkyearbook21.netlify.app/](https://iitkyearbook21.netlify.app/)

## 📖 About

This project contains the yearbook memoirs for IITK's 2021 batch. Users can log in with their IITK username to explore memoirs, view statistics, and interact with the social graph of connections.

## 🚀 Features

- **User Authentication**: Login with IITK username
- **Memoir Exploration**: Browse and search through yearbook memoirs
- **Statistics Dashboard**: View comprehensive statistics about the memoirs
- **Social Graph**: Visualize connections and relationships
- **Personalized View**: Filter memoirs by author, recipient, and privacy settings

## 📁 Project Structure

- `public/` - Web application files (HTML, CSS, JavaScript)
  - `public/data/` - Data files used by the web application (CSV, JSON)
- `data/` - Source data files
  - `data/data_raw/` - Raw data files
  - `data/allConfessions.csv` - Source confessions data
  - `data/hiddenConfessions.csv` - Source hidden confessions data
- `archive/` - Archived backups and development files
- `scripts/` - Python utility scripts
- `netlify.toml` - Netlify deployment configuration

## 🛠️ Deployment

This project is deployed on Netlify. The `public/` directory serves as the build output.

## 📝 Note

Only usernames from the Y17 batch or earlier are supported for login.

