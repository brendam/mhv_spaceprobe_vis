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

*/

var outputFormat = d3.time.format("%Y %m %d %H:%M:%S");

// Note: d3 doesn't support %Z in input parsing yet
// var createdAtFormat = d3.time.format("%a %b %d %H:%M:%S %Z %Y");

var newData = new Array();

$(document).ready(function() { 

// Get latest tweets using jTwitter

	$.jTwitter('makehackvoid', 500, function(data) {
		$('#posts').empty();
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
	var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "help"];
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

// Button to trigger transition between circles and symbols
// Button is working (tested with "alert") but transitions are not.	
	d3.select("#daybreakdown button").on("click", function() {
    daychart.select("circle")
        .style("opacity", 1)
      .transition()
        .duration(750)
        .style("opacity", 1e-6);

    daychart.select("symbol")
        .style("opacity", 1)
        .transition()
        .duration(750)
        .style("opacity", 1e-6);
  });
	
}

