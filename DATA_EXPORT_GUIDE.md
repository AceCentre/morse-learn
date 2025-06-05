# Morse Learn - Public Data Export Guide

This guide explains how to access and use the public data export feature of Morse Learn.

## Overview

The Morse Learn application now provides public access to anonymized training data for research and analysis purposes. All user identifiers have been anonymized to protect privacy while preserving valuable learning patterns.

## Available Endpoints

### 1. Data Export Interface
**URL:** `/data-export`
- **Description:** User-friendly web interface for accessing data dumps and statistics
- **Features:** 
  - Live statistics display
  - Download buttons for different formats
  - Data description and research information
- **Access:** Open in any web browser

### 2. JSON Data Export
**URL:** `/api/data-dump`
- **Format:** JSON
- **Description:** Complete anonymized dataset with metadata
- **Use case:** Programmatic access, web applications, APIs

**Example response structure:**
```json
{
  "metadata": {
    "total_records": 1500,
    "export_date": "2024-01-15T10:30:00.000Z",
    "description": "Anonymized Morse Learn training data",
    "note": "User identifiers have been anonymized..."
  },
  "data": [
    {
      "anonymous_user_id": "user_1",
      "progress_dump": "{\"a\":4,\"b\":3,\"c\":2}",
      "progress_percent": 75,
      "time_played_ms": 450000,
      "time_played_minutes": 7.5,
      "date_created": "2024-01-15",
      "visual_hints": true,
      "speech_hints": true,
      "sound": true,
      "settings_dump": "{\"sound\":true,\"speechHints\":true,\"visualHints\":true}",
      "progress_detail": "{\"accuracy\":0.85}",
      "settings_changed": false
    }
  ]
}
```

### 3. CSV Data Export
**URL:** `/api/data-dump/csv`
- **Format:** CSV (Comma-Separated Values)
- **Description:** Spreadsheet-friendly format for analysis tools
- **Use case:** Excel, R, Python pandas, statistical software
- **Auto-download:** File automatically downloads as `morse-learn-data-export.csv`

### 4. Live Statistics
**URL:** `/api/stats`
- **Format:** JSON
- **Description:** Real-time usage statistics and analytics
- **Use case:** Dashboards, monitoring, quick insights

**Example statistics included:**
- Total unique users and sessions
- Average progress and completion rates
- Settings preferences distribution
- Time-based usage patterns
- Progress distribution across user base

## Data Fields Description

| Field | Type | Description |
|-------|------|-------------|
| `anonymous_user_id` | String | Anonymized user identifier (e.g., "user_123") |
| `progress_dump` | JSON String | Letter-by-letter progress scores |
| `progress_percent` | Integer | Overall completion percentage (0-100) |
| `time_played_ms` | Integer | Session duration in milliseconds |
| `time_played_minutes` | Float | Session duration in minutes (calculated) |
| `date_created` | Date | Training session date (day precision) |
| `visual_hints` | Boolean | Whether visual hints were enabled |
| `speech_hints` | Boolean | Whether speech hints were enabled |
| `sound` | Boolean | Whether sound was enabled |
| `settings_dump` | JSON String | Complete settings configuration |
| `progress_detail` | JSON String | Additional progress details (if available) |
| `settings_changed` | Boolean | Whether settings were modified during session |

## Privacy & Anonymization

- **User Identifiers:** Original UUIDs replaced with sequential anonymous IDs
- **Timestamps:** Exact times rounded to day precision
- **No PII:** No personally identifiable information included
- **Research Ready:** Data suitable for academic and commercial research

## Usage Examples

### Command Line Access
```bash
# Download JSON data
curl -o morse-data.json https://your-domain.com/api/data-dump

# Download CSV data
curl -o morse-data.csv https://your-domain.com/api/data-dump/csv

# Get current statistics
curl https://your-domain.com/api/stats | jq .
```

### Python Analysis
```python
import requests
import pandas as pd
import json

# Load data
response = requests.get('https://your-domain.com/api/data-dump')
data = response.json()

# Convert to DataFrame
df = pd.DataFrame(data['data'])

# Basic analysis
print(f"Total records: {len(df)}")
print(f"Unique users: {df['anonymous_user_id'].nunique()}")
print(f"Average progress: {df['progress_percent'].mean():.1f}%")
```

### R Analysis
```r
library(jsonlite)
library(dplyr)

# Load data
data <- fromJSON("https://your-domain.com/api/data-dump")
df <- data$data

# Basic analysis
summary(df$progress_percent)
table(df$visual_hints, df$speech_hints)
```

## Research Applications

This dataset enables research into:

1. **Learning Curve Analysis**
   - Progress patterns over time
   - Optimal learning sequences
   - Difficulty progression

2. **Accessibility Features**
   - Impact of visual vs. auditory hints
   - Sound preferences and outcomes
   - Multi-modal learning effectiveness

3. **Usage Patterns**
   - Session duration analysis
   - Engagement metrics
   - Completion predictors

4. **Settings Optimization**
   - Most effective configurations
   - User preference clustering
   - Adaptive learning recommendations

## Previous Research

See the `morse-learn-data-analysis/` directory for previous analysis work, including:
- Statistical analysis scripts (R)
- Visualization examples
- Research findings and insights

## Technical Notes

- **CORS:** Public endpoints allow cross-origin requests
- **Rate Limiting:** Consider implementing if needed for production
- **Caching:** Data is generated fresh on each request
- **Performance:** Large datasets may take time to export
- **Updates:** Data reflects current database state

## Support

For questions about the data export feature:
- **GitHub Issues:** [morse-learn repository](https://github.com/AceCentre/morse-learn)
- **Documentation:** See README.md and API service documentation
- **Contact:** Ace Centre team

## License

This data is provided under the same license as the Morse Learn project. Please cite appropriately in research publications.
