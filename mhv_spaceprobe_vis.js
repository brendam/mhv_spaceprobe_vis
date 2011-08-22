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

	$.jTwitter('makehackvoid', 400, function(data) {
		$('#posts').empty();
		$.each(data, function(i, post) { 
			
			
			// only look at tweets that say they came from the Space Probe
			if (post.source.indexOf("MHV Space Probe") != -1) {
				var tweetType = "";
				var tweetDate = new Date(post.created_at);
				textDate = outputFormat(tweetDate);
				if (post.text.indexOf("is now open") != -1) {
					tweetType = "o"; // open
				} else if (post.text.indexOf("is now closed") != -1) {
					tweetType = "c"; // closed
				} else if (post.text.indexOf("will remain open") != -1) {
					tweetType = "e"; // extend opening time
				} 
				
				/*
				// this code will display all the retrieved tweets
					$('#posts').append(
						'<div class="post">'
						+' <div class="date">'
						+	 tweetDate
						+' </div>'
						+'<div class="txt">'
						+	 post.text
						+' </div>'
						+'</div>'
					);
				*/
				
				var mhv = new Object();
				mhv.tweetDate = tweetDate;
				mhv.tweetType = tweetType;
				newData.push(mhv); 
			}
		});

		drawGraph(newData);

	});
});

function drawGraph(data) { 
	// function to draw the graph
	// second version with lots of help from http://www.recursion.org/d3-for-mere-mortals/
	// Thanks @lof for your d3.js timeline tutorial, I'm finally starting to understand how it works. 
	var w = 640,
		h = 320,
		padding = 40; 
				
	// TODO: wondering if there is a way to move the conversion of the tweetDate 
	// into the hours on 2011/01/01 into the scale instead of doing it when the scale is called?	
	var y = d3.time.scale()
		.domain([new Date(2011, 0, 1), new Date(2011, 0, 1, 23, 59)])
		.range([0, h]); 
	// var x = d3.time.scale().domain([new Date(2011, 0, 1), new Date(2011, 11, 31)]).range([0, width]);
	var monthNames = ["Jan", "Feb", "Mar", "April", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "help"];
	var x = d3.scale.linear() 
		// .domain([0, data.length])
		.domain([1, 7])
		.range([20, w - 20]); 

	function yAxisLabel(d) {
		if (d == 12) {
			return "noon";
		}
		if (d < 12) {
			return d;
		}
		return (d - 12);
	} 
	// The labels along the x axis will be positioned on the 15th of the month


	function midMonthDates() {
		return d3.range(0, 12).map(function(i) {
			return new Date(2011, i, 15)
		});
	}

	function midDayPos() {
		return d3.range(1, 8).map(function(i) {
			return i
		});
	}
	
	var chart = 
		d3.select("body").append("svg:svg")
			.attr("class", "chart")
			.attr("width", w + padding * 2)
			.attr("height", h + padding * 2); // create a group to hold the axis-related elements
	
	var axisGroup = chart
		.append("svg:g")
			.attr("transform", "translate(" + padding + "," + padding + ")"); // add the chart axis to the axisGroup
	
	axisGroup.selectAll(".yTicks")
		.data(d3.range(0, 24))
		.enter().append("svg:line")
			.attr("x1", -5) // Round and add 0.5 to fix anti-aliasing effects
			.attr("y1", function(d) { return d3.round(y(new Date(2011, 0, 1, d))) + 0.5;})
			.attr("x2", w + 5)
			.attr("y2", function(d) { return d3.round(y(new Date(2011, 0, 1, d))) + 0.5;})
			.attr("stroke", "lightgray")
			.attr("class", "yTicks");
			
	axisGroup.selectAll(".xTicks") //.data(midMonthDates)
		.data(midDayPos)
		.enter().append("svg:line")
			.attr("x1", x)
			.attr("y1", -5)
			.attr("x2", x)
			.attr("y2", h + 5)
			.attr("stroke", "lightgray")
			.attr("class", "yTicks"); // draw the text for the labels
	
	axisGroup.selectAll("text.xAxisTop") //	.data(midMonthDates)
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
			.attr("class", "yAxisLeft")
			.attr("text-anchor", "end");
	
	var graphGroup = chart.append("svg:g")
						.attr("transform", "translate(" + padding + ", " + padding + ")");
	
	var circle = graphGroup.selectAll("circle")
						.data(data);
	
	circle.enter().append("svg:circle") 
		.attr("cy", function(d) { return y(new Date(2011, 0, 1, d.tweetDate.getHours(), d.tweetDate.getMinutes())); })
		.attr("cx", function(d) { return x(d.tweetDate.getDay() + 1); })
		.attr("r", 10)
		.attr("fill-opacity", .5)
		.style("fill", function(d) { return circleColour(d.tweetType); });

	function circleColour(tweetType) {
		var colour;
		switch (tweetType) {
		case "c":
			colour = "#990000";
			break;
		case "o":
			colour = "#009900";
			break;
		case "e":
			colour = "#000099";
			break;
		default:
			colour = "#000000";
		}
		return colour;
	}
	
	circle.exit().remove();
}
