/*

Using jTwitter.js to grab tweets from the 'makehackvoid' twitter account and then 
select the ones that came from the spaceprobe.

Using d3.js to display visualisations of the open / close / extend events

Possible formats from the spaceprobe are:
	The MHV space will remain open for approximately another xxxx hours (~hh:mm)
	The MHV space will remain open for approximately another nn minutes (~18:15)
	The MHV space is now open for approximately xxxx hours (~hh:mm)
	The MHV space is now open for approximately an hour (~hh:mm)
	The MHV space is now closed (was open 4 1/2 hours)
	The MHV space is now closed (was open nnn minutes)
	The MHV space is now closed (was open xxxx hours)

 (~hh:mm) is the estimated closing time
 Note: all time estimates in brackets seem to be rounded to nearest 15 minutes

Ideas to try:
	1.  create datapoints based on open / close pairs
		for example open is terminated by close, or if a close isn't seen, by the
		subsequent open and just uses predicted open + any extensions. 
	2.	Change x axis to be dates, not days
	3.  transition so data appears gradually onto graph (and maybe older data fades out?)
		way to do this is given in http://mbostock.github.com/d3/tutorial/bar-2.html
	4.	Possibly try a spiral display of the timeline
*/

var outputFormat = d3.time.format("%Y %m %d %H:%M:%S");

// Note: d3 doesn't support %Z in input parsing yet
// var createdAtFormat = d3.time.format("%a %b %d %H:%M:%S %Z %Y");

var newData = new Array();

$(document).ready(function() { 

// Get latest tweets using jTwitter

	$.jTwitter('makehackvoid', 500, function(data) {
		$('#posts').empty();
		$('#posts').append('<button>Show data table</button>');
		$('#posts').append('<table id="tweetsTable">');
		$('#tweetsTable')
			.append('<tr><th>Time</th><th>Tweet text</th><th>parsed times (close time / actual open period)</th></tr>');
		$.each(data, function(i, post) { 
			// only look at tweets that say they came from the Space Probe
			if (post.source.indexOf("MHV Space Probe") != -1) {
				var tweetType = "";
				var tweetDate = new Date(post.created_at);
				var actualOpenPeriod = "";
				var closeTimeEstimate = "";
				textDate = outputFormat(tweetDate);
				if (post.text.indexOf("is now open") != -1) {
					tweetType = "o"; // open
					startEstimate = post.text.indexOf("(~");
					endEstimate = post.text.indexOf(")");
					if (startEstimate != -1 && endEstimate != -1 && startEstimate < endEstimate) {
						closeTimeEstimate = post.text.substring(startEstimate+2, endEstimate); 
					}
					
				} else if (post.text.indexOf("is now closed") != -1) {
					tweetType = "c"; // closed
					startOpen = post.text.indexOf("(was open ");
					endOpen = post.text.indexOf(")");
					if (startOpen != -1 && endOpen != -1 && startOpen < endOpen) {
						actualOpenPeriod = post.text.substring(startOpen+("(was open ").length, endOpen); 
					}

				} else if (post.text.indexOf("will remain open") != -1) {
					tweetType = "e"; // extend opening time
				} 

				if (tweetType == "o" || tweetType == "c") {
					// ignoring extensions for now
					if (actualOpenPeriod.indexOf("days") == -1 ) {
					// if actual open period contains "days" discard it as out of range
				
						// display the tweets & parsed data
						$('#tweetsTable').append(
							'<tr>'
							+' <td>'
							+	 tweetDate
							+' </td>'
							+' <td>'
							+	 post.text
							+' </td>'
							+' <td>'
							+ closeTimeEstimate + " /  " + actualOpenPeriod
							+' </td>'
							+'</tr>'
						);
						var mhv = new Object();
						mhv.tweetDate = tweetDate;
						mhv.tweetType = tweetType;
						mhv.openEstimate = closeTimeEstimate;
						mhv.actualOpen = actualOpenPeriod;
				    	newData.push(mhv); 
				    }
				}
			}
		});
		
		$('#posts').append('</table>');

		drawGraph(newData);

	});
});

function drawGraph(data) { 
	// function to draw the graph
	// second version with lots of help from http://www.recursion.org/d3-for-mere-mortals/
	// Thanks @lof for your d3.js timeline tutorial, I'm finally starting to understand how it works. 
	var w = 640,
		h = 380,
		padding = 50; 
				
	// define the y scale (note: need to coerce data to 1.1.2011 before scaling)				
	var y = d3.time.scale()
		.domain([new Date(2011, 0, 1), new Date(2011, 0, 1, 23, 59)])
		.range([0, h]); 
	
	// define x scale (days of week in current version)	
	// var x = d3.time.scale().domain([new Date(2011, 0, 1), new Date(2011, 11, 31)]).range([0, width]);
	var monthNames = ["Jan", "Feb", "Mar", "April", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	var hourNames = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

	var x = d3.scale.linear() 
		// .domain([0, data.length])
		.domain([1, 7])
		.range([padding/2, w - padding/2]); 

	function yAxisLabel(d) {
		if (d == 12) {
			return "noon";
		}
		if (d < 12) {
			return d;
		}
		return (d - 12);
	} 
	
	function midMonthDates() {
		// The labels along the x axis will be positioned on the 15th of the month
		return d3.range(0, 12).map(function(i) {
			return new Date(2011, i, 15)
		});
	}

	function midDayPos() {
		// day labels for x axis
		return d3.range(1, 8).map(function(i) {
			return i
		});
	}
	
	// create the chart
	var daychart = 
		d3.select("#daybreakdown").append("svg:svg")
			.attr("class", "daychart")
			.attr("width", w + padding * 2)
			.attr("height", h + padding * 2); 
			
	// create a group to hold the axis-related elements
	var axisGroup = daychart
		.append("svg:g")
			.attr("transform", "translate(" + padding + "," + padding + ")"); 
			
	// add the chart axis to the axisGroup
	axisGroup.selectAll(".yTicks")
		.data(d3.range(0, 24))
		.enter().append("svg:line")
			.attr("x1", -5) 
			// Round and add 0.5 to fix anti-aliasing effects
			.attr("y1", function(d) { return d3.round(y(new Date(2011, 0, 1, d))) + 0.5;})
			.attr("x2", w + 5)
			.attr("y2", function(d) { return d3.round(y(new Date(2011, 0, 1, d))) + 0.5;})
			.attr("class", "yTicks");
			
	axisGroup.selectAll(".xTicks") 
		//.data(midMonthDates)
		.data(midDayPos)
		.enter().append("svg:line")
			.attr("x1", x)
			.attr("y1", -5)
			.attr("x2", x)
			.attr("y2", h + 5)
			.attr("class", "xTicks"); 
			
	// draw the text for the labels
	
	axisGroup.selectAll("text.xAxisTop") 
	//	.data(midMonthDates)
		.data(midDayPos)
		.enter().append("svg:text")
			.text(function(d, i) { return dayNames[i];})
			.attr("x", x)
			.attr("y", -8)
			.attr("text-anchor", "middle")
			.attr("class", "axis xAxisTop");
	
	axisGroup.selectAll("text.yAxisLeft")
		.data(d3.range(0, 24))
		.enter().append("svg:text")
			.text(yAxisLabel)
			.attr("x", -7)
			.attr("y", function(d) { return y(new Date(2011, 0, 1, d)); })
			.attr("dy", "3")
			.attr("class", "axis yAxisLeft")
			.attr("text-anchor", "end");
	
	var graphGroup = daychart.append("svg:g")
						.attr("transform", "translate(" + padding + ", " + padding + ")");
	
// Circles to show the events
	var circle = graphGroup.selectAll("circle")
						.data(data);
	
	circle.enter().append("svg:circle") 
		.attr("cy", function(d) { return y(new Date(2011, 0, 1, d.tweetDate.getHours(), d.tweetDate.getMinutes())); })
		.attr("cx", function(d) { return x(d.tweetDate.getDay() + 1); })
		.attr("r", 10)
		.attr("class", function(d) { return "circle_" + d.tweetType; });
	
	circle.exit().remove();

// Symbols to show the events
	var path = graphGroup.selectAll("path")
    	.data(data);
  	path.enter().append("svg:path")
	    .attr("transform", function(d) { 
	    		return "translate("  
	    		+ x(d.tweetDate.getDay() + 1) + "," 
	    		+ y(new Date(2011, 0, 1, d.tweetDate.getHours(),d.tweetDate.getMinutes())) 
	    		+ ")"; })
	    .attr("d", d3.svg.symbol().type(function(d) {return symType(d.tweetType);}).size(20))
	    .attr("class", function(d) { return "symbol_" + d.tweetType; });
 
	function symType(tweetType) {
		var symType = "circle";
		switch (tweetType) 
		{
		case "c": 
			symType = "triangle-up";
			break;
		case "o":
			symType = "triangle-down"
			break;
		case "e":
			symType = "square";
		}
		 return(symType);
	}
// Rectangles to show the events
	var rectangle = graphGroup.selectAll("rect")
						.data(data);
	var barWidth = 10;
	rectangle.enter().append("svg:rect") 
		.attr("x", function(d) { return x(d.tweetDate.getDay() + 1) - barWidth/2; })
		.attr("y", function(d) { return y(new Date(2011, 0, 1, d.tweetDate.getHours(), d.tweetDate.getMinutes())); })
		.attr("width", barWidth)
		.attr("height", function(d) { return barHeight(d); })
	    .attr("class", function(d) { return "rect_" + d.tweetType; })
	    // transform close bars to be above the close time, and if they are up to 2am, move them to end of previous day
	    .attr("transform", function(d) { return transXY(d)});
	
	rectangle.exit().remove();


    function transXY(d) {
     	var xTrans = 0
     	var yTrans = 0;
    	if (d.tweetType == "c") {
 			if (d.tweetDate.getHours() <= 2) {
				// could improve this to test if the open period went over midnight
				// if just after midnight, then move the bar to the end of the previous day…
				// have to wrap for week as well (not happening at the moment - but no early morning closes on a Sunday)
  				xTrans =  - (x(3) - x(2));
  				yTrans =  y(new Date(2011,0,1, 24, 0)) 
  						- barHeight(d) 
  						- y(new Date(2011, 0, 1, d.tweetDate.getHours(), d.tweetDate.getMinutes()));
			} else {
				// transform bar back by its height
  			 	yTrans = - (barHeight(d));
			}
 		} 
  		return  ("translate(" +  xTrans + "," + yTrans + ")");
    }
	
	function barHeight(d) {
		// positive height if tweetType is open, negative if close
		// need to map the tweet height onto the timescale
		var height = 0;
		var rawheight = (d.tweetType )
		d.tweetType
		d.openEstimate
		d.actualOpen
		switch (d.tweetType) 
		{
		case "c": 
			// d.actualOpen is expressed in hours or minutes or seconds
			// can't have negative heights for a svg:rect, so to do bars for actual open need 
			// to add a transform to move the bar back by it's height
			if (d.actualOpen.indexOf("minutes") != -1) {
				var timeBits = d.actualOpen.split(" ");
				// timeBits[0] will contain open time in minutes
				height = y(new Date(2011, 0, 1, Math.floor(timeBits[0]/60), (timeBits[0]%60)));
			} else if (d.actualOpen.indexOf("hours")) {
				var timeBits = d.actualOpen.split(" ");
				if (timeBits.length == 3) {
					// we have format like "4 1/2 hours"
					// I'm assuming it is always rounded to a 1/2 hour
					height = y(new Date(2011,0,1, timeBits[0], 30));
				} else {
					// we have format like "three hours" or "7 hours"
					var hourConverted = jQuery.inArray(timeBits[0], hourNames);
					if (hourConverted != -1) {
						// it was a text hour name
						timeBits[0] = hourConverted + 1;
					}
					height = y(new Date(2011,0,1, timeBits[0],0));
				}
			} else if (d.actualOpen.indexOf("seconds")) {
					// i think I'll ignore these!
					height = 0;
			} else {
				  	// unexpected time format
				  	height = 0;
			}
			// seems like some of the actual (tweetType = "c") open periods are too long
			// NEED TO LOOK AT DATA & SEE WHAT IS GOING ON 
			// truncate at start of day, but only if after 2 am
			if (d.tweetDate.getHours() >= 2) {
				var maxHeight = y(new Date(2011, 0, 1, d.tweetDate.getHours(), d.tweetDate.getMinutes())) - y(new Date(2011,0,1,0,0)); 
				if ( height > maxHeight) {
					height = maxHeight;				
				}
			}
			
			break;
		case "o":
		    // d.openEstimate is expressed as a time of day
			 var timeBits = d.openEstimate.split(":");
			 if (timeBits[0] == 0) {
			 	// over boundary of 12 midnight! so just make it go to bottom of screen
			 	// should really create a second bar the following morning going to the predicted close time
			 	timeBits = ["24", "00"];
			 }
			 height = y(new Date(2011, 0, 1, timeBits[0], timeBits[1])) - y(new Date(2011, 0, 1, d.tweetDate.getHours(), d.tweetDate.getMinutes()));
			break;
		case "e":
		// not processing these
			height = 0;
		}
		return height;
	}


// Button to trigger transition between circles and symbols
	d3.select("#daybreakdown button#symbolToggle").on("click", function() {
 		daychart.selectAll("circle")
 			.transition()
 				.duration(750)
 				.style("opacity", (daychart.selectAll("circle").style("opacity") == 0.5) ? 1e-6 : 0.5 );
// would like to find a way to avoid selecting the same object a second time in the if test
// 				.style("opacity", function (d) { return (d.style("opacity") == 0.5) ? 1e-6 : 0.5 });
		daychart.selectAll("path")
         	.transition()
 	     	  	.duration(750)
 				.style("opacity", (daychart.selectAll("path").style("opacity") == 0.5) ? 1e-6 : 0.5 );
	   d3.select("#daybreakdown button#symbolToggle")
	   		.text((d3.select("#daybreakdown button#symbolToggle").text() == "Show symbols") ? "Show circles" : "Show symbols");
  });
  
// Button to show / hide data
	d3.select("#posts button").on("click", function() {
		d3.select("#posts table")
			.style("visibility", (d3.select("#posts table").style("visibility") == "hidden") ? "visible" : "hidden");
		d3.select("#posts button")
			.text((d3.select("#posts table").style("visibility") == "visible") ? "Hide data table" : "Show data table");
	});

// Button to show / hide open estimate bars
	d3.select("#daybreakdown button#estimatesToggle").on("click", function() {
		daychart.selectAll("rect.rect_o")
			.style("visibility", (d3.selectAll("rect.rect_o").style("visibility") == "hidden") ? "visible" : "hidden");
		d3.select("#daybreakdown button#estimatesToggle")
	   		.text((d3.select("#daybreakdown button#estimatesToggle").text() == "Show open estimates") ? "Hide open estimates" : "Show open estimates");
  });


// Button to show / hide actual open bars
	d3.select("#daybreakdown button#actualsToggle").on("click", function() {
		daychart.selectAll("rect.rect_c")
			.style("visibility", (d3.selectAll("rect.rect_c").style("visibility") == "hidden") ? "visible" : "hidden");
		d3.select("#daybreakdown button#actualsToggle")
	   		.text((d3.select("#daybreakdown button#actualsToggle").text() == "Show actual opens") ? "Hide actual opens" : "Show actual opens");
  });
 	
}

