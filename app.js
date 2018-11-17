const rp = require( 'request-promise' );
const cheerio = require( 'cheerio' );

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
			console.log( 'rp fail', err )
		});
	
}


/**
 * getFightsOnCard
 */
let getFightsOnCard = ( mma_card ) => {

	return getFightCardData( mma_card ).then( buildFightsFromFightCardData );
}


/**
 * buildFightsFromFightCardData
 */
let buildFightsFromFightCardData = ( card_matchup_data ) => {
	let until = card_matchup_data.length;
	let i = 0;
	let fights = [];
	let tmpFight = {};

	console.log('buildFightsFromFightCardData');

	for (;i<until;i=i+1) {
		tmpFight = getFight( card_matchup_data[ i ] )
		fights.push( tmpFight );
	}
	console.log( 'returning fights' );
	console.log(fights);
	return fights;
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
	console.log( 'getFightCardData' );

	return rp( options )
		.then(($) => {

			// Instantiate variables.
			let tmpContainer;
			let matchup;
			let stats;
			let f1_container;
			let f2_container;
			let f1_stats_container;
			let f2_stats_container;
			let f1 = {};
			let f2 = {};
			let card_matchup_data = [];
			let matchupIndex = 1;

			tmpContainer = $( '.container table.tblRank' );

			for (;tmpContainer.find( 'tr' ).eq( matchupIndex ).text() != "";matchupIndex=matchupIndex+4) {
				// Grab data elements.
				let tmpFightContainer = {};
				tmpFightContainer.fighter = tmpContainer.find( 'tr' ).eq( matchupIndex );
				tmpFightContainer.stats = tmpContainer.find( 'tr' ).eq( matchupIndex + 3 );

				// console.log( 'adding tmpFightContainer' );
				// console.log( tmpFightContainer );

				card_matchup_data.push( tmpFightContainer );
			}

			// console.log(' returning card_matchup_data array... ');
			// console.log( card_matchup_data.length );

			return card_matchup_data;

		})
		.catch( ( err ) => {
			console.log( 'rp fail', err)
		});
}


/**
 * getFight
 */
let getFight = ( fight_data ) => {
	// let fight_containers;
	// let fight_stat_containers;

	let i = 0;
	let f1 = {
		fighter: fight_data.fighter.find( 'td' ).eq( 0 ),
		stats: fight_data.stats.find( 'td' ).eq( 0 ),
	}
	let f2 = {
		fighter: fight_data.fighter.find( 'td' ).eq( 1 ),
		stats: fight_data.stats.find( 'td' ).eq( 1 ),
	}
	let fight_data_array = [ f1, f2 ];
	let fight = {};

	for (;i<fight_data_array.length;i=i+1) {
		// Get Fighter data.
		// console.log('iteratings on %s, of total %s', i, fight_data_array.length);

		getFighter( fight_data_array[ i ] )
			.then( ( fighter ) => {
				fight[ "fighter" + i ] = fighter;
				// return fighter;
			})
			.catch(( err ) => {
				console.log('ack! err', err)
			});
	}

	console.log('returning fight...');
	console.log( fight );
	return fight;
}


/**
 * getFighter
 */
let getFighter = async ( fight_data ) => {
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


// let next_card = getNextFightCard();
let next_card = {"card_uri":"/upcoming-events/UFC-Fight-Night-140:-Magny-vs.-Ponzinibbio/69285/","card_name":"UFC Fight Night 140: Magny vs. Ponzinibbio [UFC]"};
let fights = getFightsOnCard( next_card );

// console.log( fights );