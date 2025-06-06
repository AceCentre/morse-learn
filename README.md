# Morse Typing Trainer
This is a fork of the original [Google/Tania Finlayson Morse code trainer](https://github.com/googlecreativelab/morse-learn). Adapted to help people with a visual impairment - but also because many people prefer Auditory Mnemoics better than visual ones for learning morse code.

Main differences:

- Uses auditory cues - for correct/wrong and auditory mnemoic hints
- Fixes a lot of problems with the original about not running in different browsers. The demo didn't reliably detect browsers/platforms.

*Use with a dot and dash keyboard keys - or map switches to these keys*

Learn More at [g.co/morse](http://g.co/morse).<br>
Built using [Phaser.js](https://phaser.io).

## Usage
```
npm install; // install dependencies
npm run start; // start the local webserver
npm install && npm rebuild node-sass && npm run browserify && npm run sass
; // run for production
```

## API Service

The application includes an API service for collecting analytics data. The API service is built with Express.js and connects to a MySQL database on DigitalOcean.

### Public Data Export

The application now includes a public data export feature that allows researchers and developers to access anonymized training data:

- **Data Export Page**: Visit `/data-export` for a user-friendly interface
- **JSON Export**: `/api/data-dump` - Complete dataset in JSON format
- **CSV Export**: `/api/data-dump/csv` - Spreadsheet-friendly format
- **Live Statistics**: `/api/stats` - Real-time usage statistics and analytics

All exported data is anonymized to protect user privacy while preserving learning patterns for research purposes.

### Setup and Deployment

For detailed deployment instructions, see:
- [API Service README](api-service/README.md) - For API service specific setup
- [DEPLOYMENT.md](DEPLOYMENT.md) - For unified deployment of both the static site and API service

The application can be deployed as a single app on DigitalOcean App Platform, with both the static site and API service components working together.


## Contributors
Originally made by Tania Finlayson and [Use All Five](https://useallfive.com) with friends at the Google Creative Lab in collaboration. This fork was made by the [Ace Centre](https://acecentre.org.uk). [Matthew Wade](https://www.matthewwade.net), Actor & Voice over artist, Kindly created the "soundsalike" sounds.

This is not an officially supported Google product.

## License
Copyright 2018 Google Inc.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## Final Thoughts
We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators’ rights, including copyright and trademark rights when present, when sharing these works and creating derivative work.

If you want more info on Google's policy, you can find that [here](https://www.google.com/policies/).
