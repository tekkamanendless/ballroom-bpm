async function onPageLoaded() {
	{
		document.querySelector('#bpm').addEventListener('click', focus);
		document.querySelector('#bpm').addEventListener('keydown', (e) => {
			console.log("keydown!", e);
			if (e.key == 'Escape') {
				reset();
			}
		});
	}

	{
		let response = await fetch('data.json');
		let data = await response.json();
		console.log("data:", data);
		let processedData = processData(data);
		console.log("processedData:", processedData);
		renderChart(document.querySelector('#chart'), processedData);

		handleFilter();
	}
}

function handleFilter() {
	let filters = processFilters();
	updateChart(document.querySelector('#chart'), filters);
}

function queryFilters() {
	if (!document.querySelector('#chart .filter')) {
		return null;
	}

	let filters = {
		danceStyles: [],
	};

	let inputs = document.querySelectorAll('#chart .filter input[type="checkbox"][name="style"]:checked');
	for (let input of inputs) {
		filters.danceStyles.push(input.value);
	}

	return filters;
}

function processFilters() {
	let filters = queryFilters();
	console.log("filters:", filters);
	return filters;
}

function processData(data) {
	let processedData = {
		dances: [],
		danceNames: [],
		danceStyles: [],
		minimumBpm: 0,
		maximumBpm: 0,
	};

	let danceMap = {};
	let styleMap = {};
	for (let dance of data.dances) {
		if (!dance.min || !dance.max) {
			continue;
		}

		danceMap[dance.name] = dance.name;
		styleMap[dance.style] = dance.style;

		if (processedData.minimumBpm === 0 || dance.min < processedData.minimumBpm) {
			processedData.minimumBpm = dance.min;
		}
		if (processedData.maximumBpm === 0 || dance.max > processedData.maximumBpm) {
			processedData.maximumBpm = dance.max;
		}

		processedData.dances.push(dance);
	}

	for (let key in danceMap) {
		processedData.danceNames.push(key);
	}
	processedData.danceNames.sort();

	for (let key in styleMap) {
		processedData.danceStyles.push(key);
	}
	processedData.danceStyles.sort();

	processedData.dances.sort((left, right) => {
		let diff = left.min - right.min;
		if (diff != 0) {
			return diff;
		}
		diff = left.max - right.max;
		return diff;
	})

	return processedData;
}

function renderChart(chartElement, data) {
	chartElement.innerHTML = "";

	{
		let fieldset = document.createElement("fieldset");
		fieldset.className = "filter";

		let legend = document.createElement("legend");
		legend.appendChild(document.createTextNode("Filter"));
		fieldset.appendChild(legend);

		{
			let container = document.createElement("div");

			for (let style of data.danceStyles) {
				let label = document.createElement("label");
				label.dataset.style = style;

				let checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.value = style;
				checkbox.checked = true;
				checkbox.name = "style";
				checkbox.addEventListener("change", () => {
					handleFilter();
				});
				label.appendChild(checkbox);
				label.appendChild(document.createTextNode(style));
				container.appendChild(label);
			}

			fieldset.appendChild(container);
		}

		chartElement.appendChild(fieldset);
	}

	{
		let container = document.createElement("div");
		container.className = "dances";

		for (let dance of data.dances) {
			let row = document.createElement('div');
			row.className = "row";

			row.title = dance.name;
			if (dance.style) {
				row.title += " (" + dance.style + ")";
			}
			row.title += " - " + dance.min + "-" + dance.max + "bpm";

			row.dataset.name = dance.name;
			row.dataset.style = dance.style;
			row.dataset.timing = dance.timing;
			row.dataset.min = dance.min;
			row.dataset.max = dance.max;

			row.appendChild(document.createTextNode(dance.name));

			container.appendChild(row);
		}
		chartElement.appendChild(container);
	}

	{
		let container = document.createElement("div");
		container.className = "info";

		for (let dance of data.dances) {
			let row = document.createElement('div');
			row.className = "row";

			let line = dance.name;
			if (dance.style) {
				line += " (" + dance.style + ")";
			}
			line += " - " + dance.min + "-" + dance.max + "bpm";

			row.dataset.name = dance.name;
			row.dataset.style = dance.style;
			row.dataset.timing = dance.timing;
			row.dataset.min = dance.min;
			row.dataset.max = dance.max;

			row.appendChild(document.createTextNode(line));

			if (dance.source) {
				let citation = document.createElement("sup");
				let link = document.createElement("a");
				link.target = "_blank";
				link.href = dance.source;
				link.appendChild(document.createTextNode("[source]"));
				citation.appendChild(link);
				row.appendChild(citation);
			}

			container.appendChild(row);
		}
		chartElement.appendChild(container);
	}
}

function updateChart(chartElement, filters) {
	{
		let container = chartElement.querySelector('.dances');
		let rows = chartElement.querySelectorAll('.dances .row');
		let minimumBpm = 0;
		let maximumBpm = 0;
		for (let row of rows) {
			if (!filters.danceStyles.includes(row.dataset.style)) {
				row.style.display = "none";
			} else {
				row.style.display = "";
				if (minimumBpm == 0 || parseInt(row.dataset.min) < minimumBpm) {
					minimumBpm = parseInt(row.dataset.min);
				}
				if (maximumBpm == 0 || parseInt(row.dataset.max) > maximumBpm) {
					maximumBpm = parseInt(row.dataset.max);
				}
			}
		}
		container.dataset.min = minimumBpm;
		container.dataset.max = maximumBpm;
		console.log("Filtered BPM:", minimumBpm, "to", maximumBpm);
		for (let row of rows) {
			row.style.marginLeft = ((row.dataset.min - minimumBpm) / (maximumBpm - minimumBpm) * 100) + "%";
			row.style.width = ((row.dataset.max - row.dataset.min) / (maximumBpm - minimumBpm) * 100) + "%";
			row.style.maxWidth = ((row.dataset.max - row.dataset.min) / (maximumBpm - minimumBpm) * 100) + "%";
		}
	}

	{
		let rows = chartElement.querySelectorAll('.info .row');
		for (let row of rows) {
			if (!filters.danceStyles.includes(row.dataset.style)) {
				row.style.display = "none";
			} else {
				row.style.display = "";
			}
		}
	}
}

let tapEvents = [];

function focus(e) {
	console.log("focus!", e);
	if (e.target.tagName !== 'DIV') {
		return;
	}
	document.querySelector('#bpm [autofocus]').focus();
}

function reset() {
	document.querySelector('#bpm input[name="bpm"]').value = "";
	bpmChange();
	tapEvents = [];
}

function tap() {
	console.log("Tap!");

	let cooldownPeriod = 3 * 1000;
	let maxEvents = 15;
	let now = new Date();

	if (tapEvents.length > 0) {
		if (now - tapEvents[tapEvents.length - 1] > cooldownPeriod) {
			console.log("Cooled down; resetting.");
			tapEvents = [];
		}
	}

	tapEvents.push(now);
	while (tapEvents.length > maxEvents) {
		tapEvents.shift();
	}

	console.log("tapEvents:", tapEvents);

	let bpm = 0;
	if (tapEvents.length >= 2) {
		let distances = [];
		for (let i = 1; i < tapEvents.length; i++) {
			let distance = tapEvents[i] - tapEvents[i - 1];
			distances.push(distance);
		}
		let interval = distances.reduce((a, b) => a + b) / distances.length;
		console.log("interval:", interval);
		bpm = parseInt((60 * 1000) / interval);
	}
	console.log("bpm:", bpm);
	document.querySelector('#bpm input[name="bpm"]').value = bpm;
	bpmChange();
}

function bpmChange() {
	let element = document.querySelector("#chart .dances");
	if (!element) {
		return
	}

	let minimumBpm = parseInt(element.dataset.min);
	let maximumBpm = parseInt(element.dataset.max);

	let bpm = parseInt(document.querySelector('#bpm input[name="bpm"]').value);
	if (!bpm) {
		bpm = 0;
	}
	if (bpm < minimumBpm || bpm > maximumBpm) {
		bpm = 0;
	}
	console.log("bpmChange: bpm:", bpm, "minimumBpm:", minimumBpm, "maximumBpm:", maximumBpm);

	{
		if (!bpm) {
			element.style.backgroundImage = "";
			element.style.backgroundSize = "";
			element.style.backgroundRepeat = "";
			element.style.backgroundPosition = "";
		} else {
			element.style.backgroundImage = "linear-gradient(#000, #000)";
			element.style.backgroundSize = "2px 100%";
			element.style.backgroundRepeat = "no-repeat";
			element.style.backgroundPosition = ((bpm - minimumBpm) / (maximumBpm - minimumBpm) * 100) + "% center";
		}
	}

	{
		let rows = document.querySelectorAll('#chart .dances .row');
		for (let row of rows) {
			if (bpm == 0 || bpm >= parseInt(row.dataset.min) && bpm <= parseInt(row.dataset.max)) {
				row.classList.remove('out-bpm');
			} else {
				row.classList.add('out-bpm');
			}
		}
	}

	{
		let rows = document.querySelectorAll('#chart .info .row');
		for (let row of rows) {
			if (bpm == 0 || bpm >= parseInt(row.dataset.min) && bpm <= parseInt(row.dataset.max)) {
				row.classList.remove('out-bpm');
			} else {
				row.classList.add('out-bpm');
			}
		}
	}
}
