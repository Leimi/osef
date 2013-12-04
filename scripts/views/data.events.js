define(["backbone", "underscore", "d3", "d3utils", "moment", "d3tip", "mixins"], function(Backbone, _, d3, d3utils, moment) {
	moment.lang('fr');

	var LinesChartDataView = Backbone.View.extend({
		className: 'LinesChart',
		initialize: function(options) {
			this.data = options.data;
		},
		render: function() {
			if (!this.data) return false;
			var that = this;
			var margin = {top: 20, right: 20, bottom: 30, left: 50},
				width = 700 - margin.left - margin.right,
				height = 600 - margin.top - margin.bottom;

			var parseDate = d3.time.format("%Y-%m-%d").parse;

			var x = d3.time.scale()
				.nice(d3.time.month)
				.range([0, width]);

			var y = d3.scale.linear()
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.ticks(d3.time.month, 1)
				.tickFormat(function(date, i) {
					date = moment(date);
					var format = 'MMM' + ((date.year() !== moment().year()) ? ' YY' : '');
					return date.format(format);
				});

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left");

			var line = d3.svg.line()
				.interpolate('cardinal')
				.x(function(d) { return x(d.axisDate); })
				.y(function(d) { return y(d.attendees); });

			var dotsScale = d3.scale.linear().domain([1, that.data.cities.length]).range([5, 3.5]);

			var tip = d3.tip()
				.attr('class', 'ChartTooltip')
				.html(function(d) {
					var currentYear = moment().year(),
						eventDate = moment(d.date);
					return [
						'<div class="ChartTooltip-inner" style="background-color: ',
						that.data.cities.findWhere({ id: d.city }).get('color'),
						'">',
							'<span class="ChartTooltip-attendees">',
								d.attendees, ' ', _.pluralize('personne', d.attendees),
							'</span> ',
							'<span class="ChartTooltip-date">',
								'le ', eventDate.format('D MMMM' + (currentYear != eventDate.year() ? ' YYYY' : '')),
							'</span> ',
							'<span class="ChartTooltip-city">',
								'à ', d.city.substr(0, 1).toUpperCase() + d.city.substr(1),
							'</span>',
						'</div>'
					].join('');
				});


			var data = _(this.data.filtered.events).map(function(d) {
				var obj = {
					date: parseDate(d.date),
					attendees: d.attendeeIds.length,
					city: d.city,
				};
				//i'm sure there's a better way but we set day of month to 1 to align values to axis...
				obj.axisDate = moment( obj.date).date(1).toDate();
				return obj;
			});

			var cities = _(data).chain().sortBy(function(d) { return d.date; }).groupBy(function(d) { return d.city; }).value();
			cities = _(cities).map(function(values, name) {
				return {
					name: name,
					values: values
				};
			});

			var chart;
			if (!this.el.querySelector('svg'))
				chart = d3.select(this.el).append('svg').attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);
			else
				chart = d3.select(this.el.querySelector('svg'));
			if (!this.el.querySelector('g.LinesChart-container')) {
				chart = chart
					.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
					.attr("class", "LinesChart-container");
			} else {
				chart = chart.select('g.LinesChart-container');
			}

			chart.call(tip);

			x.domain(d3.extent(data, function(d) { return d.axisDate; }));
			y.domain([0, d3.max(data, function(d) { return d.attendees; })+10]);

			if (!this.el.querySelector('.LinesChart-axis--x')) {
				chart.append("g")
					.attr("class", "LinesChart-axis LinesChart-axis--x")
					.attr("transform", "translate(0," + height + ")");
			}
			if (!this.el.querySelector('.LinesChart-axis--y')) {
				chart.append("g")
					.attr("class", "LinesChart-axis LinesChart-axis--y")
					.append("text")
						.attr("transform", "rotate(-90)")
						.attr("y", 6)
						.attr("dy", ".71em")
						.style("text-anchor", "end")
						.text("Participants");
			}

			chart.select('.LinesChart-axis--x').transition().call(xAxis);
			chart.select('.LinesChart-axis--y').transition().call(yAxis);


			var chartCities = chart.selectAll(".LinesChart-city").data(cities);
			chartCities.enter().append("g").attr("class", "LinesChart-city").append("path").attr("class", "LinesChart-line");

			chart.selectAll('.LinesChart-line').data(cities)
				.transition()
					.attr("d", function(d) { return line(d.values); })
					.style("stroke", function(d) { return that.data.cities.findWhere({ id: d.name }).get('color'); });

			chartCities.exit().remove();
			var chartDots = chart.selectAll(".LinesChart-dot").data(data);
			chartDots.enter().append("circle").attr("class", "LinesChart-dot");

			var tooltipTimeout = null;
			chart.selectAll(".LinesChart-dot")
				.on('mouseover', function(d) {
					clearTimeout(tooltipTimeout);
					tip.show(d);
				})
				.on('mouseout', function() {
					clearTimeout(tooltipTimeout);
					tooltipTimeout = setTimeout(tip.hide, 500);
				})
				.transition()
					.attr("r", dotsScale(cities.length))
					.attr("cx", function(d) { return x(d.axisDate); })
					.attr("cy", function(d) { return y(d.attendees); })
					.style("fill", function(d) { return that.data.cities.findWhere({ id: d.city }).get('color'); });

			chartDots.exit().remove();
		}
	});
	return LinesChartDataView;
});