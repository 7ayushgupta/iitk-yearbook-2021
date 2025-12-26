# Archive Directory

This directory contains files that have been archived from the main project directory. These files are not needed for the production web application but are kept for reference or potential future use.

## Archive Date
Created: December 26, 2025

## Contents

### 1. `backups/` - Backup Directories
Contains 5 backup directories (backup_1 through backup_5) with duplicate data:
- Duplicate CSV files (allConfessions.csv, hiddenConfessions.csv)
- Duplicate .pkl files (data_emails.pkl, data_ids.pkl, data_names.pkl, data_gender.pkl)
- Duplicate data_raw/ directories (553-840 .txt files each)
- Duplicate personWiseMemoirs/ directories (551-552 CSV files each)
- backup/temp/ with 217 temporary .txt files

**Reason for archiving**: These are old backups that duplicate the current production data.

### 2. `pkl_files/` - Python Pickle Files
Contains intermediate data files used during development:
- `data_emails.pkl` - Maps roll numbers to email addresses (553 entries)
- `data_ids.pkl` - Maps database IDs to roll numbers
- `data_names.pkl` - Maps names to IDs
- `data_gender.pkl` - Maps gender information

**Reason for archiving**: These are intermediate files used only in Jupyter notebooks for data processing. They can be regenerated from source data if needed. The production web app uses CSV files instead.

### 3. `notebooks/` - Jupyter Notebooks
Contains development notebooks:
- `Downloading.ipynb` - Script for downloading yearbook data
- `Filtering.ipynb` - Script for filtering and processing data
- `updatingMemoirs.ipynb` - Script for updating memoirs

**Reason for archiving**: These are development/processing scripts not needed for the production web application.

### 4. `other_files/` - Miscellaneous Files
- `blank.pdf` - Empty/placeholder PDF file
- `sample.csv` - Sample/test data file

**Reason for archiving**: These are test/sample files not used in production.

### 5. `chhaatr-khoj-data/` - Scraped Student Data
Contains 8,232 `.dat` files with scraped student information from IITK directory.

**Reason for archiving**: This is data from a separate tool (chhaatr-khoj) that scrapes student directory information. The data is not used by the yearbook web application.

## Production Files (Not Archived)

The following files remain in the project root as they are needed for production:
- `public/` - Web application files (HTML, CSS, JS, CSV)
- `allConfessions.csv` - Main confessions data (if used as source)
- `hiddenConfessions.csv` - Hidden confessions data
- `personWiseMemoirs/` - Individual memoir CSV files
- `data_raw/` - Raw data files (if needed for regeneration)
- `chhaatr-khoj/` - Tool directory (data subdirectory archived, but tool kept)
- `netlify.toml` - Deployment configuration
- `hinglishStopwords.txt` - Stopwords file (if used)

## Restoration

If you need to restore any archived files:
1. Copy the desired files/directories back from `archive/` to the project root
2. For .pkl files, you may need to regenerate them using the Jupyter notebooks in `archive/notebooks/`

