const rp = require( 'request-promise' );
const cheerio = require( 'cheerio' );
const Promise = require("bluebird");

let urls = {
	base_url: "http://www.fightmatrix.com",
	ufc_card_uri: "/upcoming-events/ufc/",
}


/**
 * getNextFightCard
 */
let getNextFightCard = () => {
	let options = {
		url: urls.base_url + urls.ufc_card_uri,
		transform: function ( body ) {
			return cheerio.load( body );
		}
	};
	return rp( options )
		.then(($) => {
			// Get values.
			let tmpEvent = $( 'table' ).eq( 2 ).find( 'a' );
			let card_uri = tmpEvent.attr( 'href' );
			let card_name = tmpEvent.text();

			// Clean up.
			card_name = card_name.split( " [URL]" )[ 0 ].trim();

			return {
				card_uri: card_uri,
				card_name: card_name
			};

		})
		.catch( ( err ) => {
			console.log( 'getNextFightCard(): rp() ERR!', err )
		});
	
}


/**
 * getFightsOnCard
 */
let getFightsOnCard = ( mma_card ) => {
	return getFightCardData( mma_card )
		.then( buildFightsFromFightCardData );
}


/**
 * buildFightsFromFightCardData
 */
let buildFightsFromFightCardData = ( card_matchup_data ) => {
	return Promise.map(card_matchup_data, ( matchup ) => {
    return getFight( matchup );
	}).then(( fights ) => {
    return fights;
	}).catch(( err )=>{
		console.log('buildFightsFromFightCardData() ERR!', err);
	});
}


/**
 * getFightCardData
 */
let getFightCardData = ( mma_card ) => {
	let options = {
		url: urls.base_url + mma_card.card_uri,
		transform: (body) => {
			return cheerio.load(body);
		}
	};

	return rp( options )
		.then(($) => {

			// Instantiate variables.
			let tmpContainer;
			let card_matchup_data = [];
			let matchupIndex = 1;

			tmpContainer = $( '.container table.tblRank' );

			// 
			for (;tmpContainer.find( 'tr' ).eq( matchupIndex ).text() != "";matchupIndex=matchupIndex+4) {
				// Grab data elements.
				let tmpFightContainer = {};
				tmpFightContainer.fighter = tmpContainer.find( 'tr' ).eq( matchupIndex );
				tmpFightContainer.stats = tmpContainer.find( 'tr' ).eq( matchupIndex + 3 );

				// Add to our array.
				card_matchup_data.push( tmpFightContainer );
			}

			return card_matchup_data;
		})
		.catch( ( err ) => {
			console.log( 'getFightCardData() Request ERR!', err)
		});
}


/**
 * getFight
 */
let getFight = ( fight_data ) => {
	let fight = {};
	let f1 = {
		fighter: fight_data.fighter.find( 'td' ).eq( 0 ),
		stats: fight_data.stats.find( 'td' ).eq( 0 ),
	}
	let f2 = {
		fighter: fight_data.fighter.find( 'td' ).eq( 1 ),
		stats: fight_data.stats.find( 'td' ).eq( 1 ),
	}
	let fight_data_array = [ f1, f2 ];

	// Map fighter data to the fight.
	return Promise.map(fight_data_array, ( fight_data ) => {
    return getFighter( fight_data );
	}).then(( fight ) => {
    return fight;
	}).catch(( err )=>{
		console.log('ERR!', err);
	});
}


/**
 * getFighter
 */
let getFighter = ( fight_data ) => {
	let fighter = {};

	// Retrieve fighter info.
	let tmpName = fight_data.fighter.find( 'a span' ).eq( 0 ).text();
	let tmpOdds = fight_data.fighter.find( 'a span' ).eq( 1 ).text();
	let tmpRank = fight_data.fighter.text().split( /#(.*?) / )[ 1 ];
	let tmpRecentRecord = fight_data.stats.text();

	// Clean up fighter info.
	tmpName = tmpName.trim();
	tmpOdds = tmpOdds.replace( /[^0-9+-]/g, "" );
	tmpRecentRecord = tmpRecentRecord.split( "Last 5: " )[ 1 ].split( "Last Fight" )[ 0 ].trim().split( ' ' );

	// Setup fighter object.
	fighter.name = tmpName;
	fighter.rank = tmpRank;
	fighter.odds = tmpOdds;
	fighter.recent_record = tmpRecentRecord;

	return fighter;
}

/**
 * Build a list of the next fight card's various fights.
 */
getNextFightCard()
	.then( getFightsOnCard )
	.then(( fights ) => {
		console.log('Fights: ');
		console.log( fights );
	}).catch((err) => {
		console.log('getNextFightCard() Promise Chain ERR! ', err);
	});