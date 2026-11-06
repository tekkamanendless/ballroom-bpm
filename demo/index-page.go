package demo

import (
	"fmt"
	"log/slog"
	"slices"
	"sort"
	"time"

	"github.com/go-app-blazar/blazar/blazar"
	"github.com/go-app-blazar/blazar/htmlevent"
	"github.com/go-app-blazar/tabler-font"
	"github.com/maxence-charriere/go-app/v11/pkg/app"
	"github.com/tekkamanendless/ballroom-bpm/internal/dance"
)

type IndexPage struct {
	app.Compo

	bpm       uint
	tapEvents []time.Time
	chartData ChartData

	filterChartData   ChartData
	filterDanceStyles map[string]bool
}

func (c *IndexPage) OnMount(ctx app.Context) {
	slog.InfoContext(ctx.Context, "IndexPage: OnMount")

	slog.InfoContext(ctx.Context, "IndexPage: OnMount", "dances", dance.Dances())
	c.chartData = createChartData(dance.Dances())
	c.filterDanceStyles = map[string]bool{}
	for _, danceStyle := range c.chartData.DanceStyles {
		c.filterDanceStyles[danceStyle] = true
	}
	c.applyFilter()
}

func (c *IndexPage) applyFilter() {
	c.filterChartData = ChartData{}

	for _, dance := range c.chartData.Dances {
		if c.filterDanceStyles[dance.Style] {
			c.filterChartData.Dances = append(c.filterChartData.Dances, dance)
		}
	}

	for _, dance := range c.filterChartData.Dances {
		c.filterChartData.DanceNames = append(c.filterChartData.DanceNames, dance.Name)
		c.filterChartData.DanceStyles = append(c.filterChartData.DanceStyles, dance.Style)
		if c.filterChartData.MinimumBPM == 0 || dance.MinBPM < c.filterChartData.MinimumBPM {
			c.filterChartData.MinimumBPM = dance.MinBPM
		}
		if c.filterChartData.MaximumBPM == 0 || dance.MaxBPM > c.filterChartData.MaximumBPM {
			c.filterChartData.MaximumBPM = dance.MaxBPM
		}
	}

	slices.Sort(c.filterChartData.DanceNames)
	c.filterChartData.DanceNames = slices.Compact(c.filterChartData.DanceNames)

	slices.Sort(c.filterChartData.DanceStyles)
	c.filterChartData.DanceStyles = slices.Compact(c.filterChartData.DanceStyles)
}

func (c *IndexPage) OnNav(ctx app.Context) {
	slog.InfoContext(ctx.Context, "IndexPage: OnNav")
}

func (c *IndexPage) Render() app.UI {
	return blazar.Page().
		Body(
			app.Div().
				Class("bpm-container").
				TabIndex(0).
				OnClick(htmlevent.WrapMouseEvent(func(ctx app.Context, e htmlevent.MouseEvent) {
					container := e.Target.Call("closest", ".bpm-container")
					//slog.InfoContext(ctx.Context, "IndexPage: OnClick", "container classList", container.Get("className").String())

					button := container.Call("querySelector", ".tap-button")
					//slog.InfoContext(ctx.Context, "IndexPage: OnClick", "button classList", container.Get("className").String())
					button.Call("focus")

					e.PreventDefault()
				})).
				OnKeyDown(htmlevent.WrapKeyboardEvent(func(ctx app.Context, e htmlevent.KeyboardEvent) {
					slog.InfoContext(ctx.Context, "IndexPage: OnKeyDown", "key", e.Key)
					if e.Key == "Escape" {
						c.reset(ctx)

						e.PreventDefault()
					}
				})).
				Body(
					app.Div().
						Class("bpm-display").
						Body(
							blazar.Input[uint]().
								Class("bpm-input").
								Bind(&c.bpm),
							blazar.Button().
								Class("reset-button").
								Label("Reset").
								Icon(tabler.IconOutlineCancel).
								OnClick(func(ctx app.Context, e htmlevent.MouseEvent) {
									c.reset(ctx)
								}),
						),
					app.Div().
						Class("bpm-controls").
						Body(
							blazar.Button().
								Class("tap-button").
								Label("Tap to the beat").
								Icon(tabler.IconOutlineHandClick).
								AutoFocus(true).
								/*OnKeyDown(func(ctx app.Context, e htmlevent.KeyboardEvent) {
									slog.Info("Button: KeyDown.", "key", e.Key)
									if e.Key == " " {
										slog.Info("Button: KeyDown.  Space was pressed.")
										e.PreventDefault()
									}
								}).*/
								OnClick(func(ctx app.Context, e htmlevent.MouseEvent) {
									c.tapToTheBeat(ctx)

									e.PreventDefault()
								}),
						),
				),
			app.Div().
				Class("chart").
				Body(
					app.FieldSet().
						Body(
							app.Legend().
								Text("Filter"),
							app.Range(c.chartData.DanceStyles).Slice(func(i int) app.UI {
								danceStyle := c.chartData.DanceStyles[i]

								return blazar.Button().
									Label(danceStyle).
									Outline(!c.filterDanceStyles[danceStyle]).
									DataSet("style", danceStyle).
									OnClick(func(ctx app.Context, e htmlevent.MouseEvent) {
										slog.InfoContext(ctx.Context, "IndexPage: Filter", "danceStyle", danceStyle)
										c.filterDanceStyles[danceStyle] = !c.filterDanceStyles[danceStyle]

										c.applyFilter()

										ctx.Update()
									})
							}),
						),
					app.Div().
						Class("dances").
						Style("--chart-min-bpm", fmt.Sprintf("%d", c.filterChartData.MinimumBPM)).
						Style("--chart-max-bpm", fmt.Sprintf("%d", c.filterChartData.MaximumBPM)).
						Style("--bpm", fmt.Sprintf("%d", c.bpm)).
						Body(
							app.Range(c.filterChartData.Dances).Slice(func(i int) app.UI {
								dance := c.filterChartData.Dances[i]

								title := dance.Name
								if dance.Style != "" {
									title += " (" + dance.Style + ")"
								}
								danceWithStyle := title
								title += " - " + fmt.Sprintf("%d", dance.MinBPM) + "-" + fmt.Sprintf("%d", dance.MaxBPM) + "bpm"

								data := map[string]any{
									"name":   dance.Name,
									"style":  dance.Style,
									"timing": dance.Timing,
									"min":    dance.MinBPM,
									"max":    dance.MaxBPM,
								}

								inOutClass := ""
								if c.bpm > 0 && (c.bpm < dance.MinBPM || c.bpm > dance.MaxBPM) {
									inOutClass = "out-bpm"
								}

								return app.Div().
									Class("row").
									Class(inOutClass).
									DataSets(data).
									Style("--min-bpm", fmt.Sprintf("%d", dance.MinBPM)).
									Style("--max-bpm", fmt.Sprintf("%d", dance.MaxBPM)).
									Title(title).
									Text(danceWithStyle)
							}),
						),
					app.Div().
						Class("info").
						Body(
							app.Range(c.filterChartData.Dances).Slice(func(i int) app.UI {
								dance := c.filterChartData.Dances[i]

								title := dance.Name
								if dance.Style != "" {
									title += " (" + dance.Style + ")"
								}
								title += " - " + fmt.Sprintf("%d", dance.MinBPM) + "-" + fmt.Sprintf("%d", dance.MaxBPM) + "bpm"

								data := map[string]any{
									"name":   dance.Name,
									"style":  dance.Style,
									"timing": dance.Timing,
									"min":    dance.MinBPM,
									"max":    dance.MaxBPM,
								}

								inOutClass := ""
								if c.bpm > 0 && (c.bpm < dance.MinBPM || c.bpm > dance.MaxBPM) {
									inOutClass = "out-bpm"
								}

								return app.Div().
									Class("row").
									Class(inOutClass).
									DataSets(data).
									Body(
										app.Text(title),
										app.Range(dance.Sources).Slice(func(i int) app.UI {
											source := dance.Sources[i]

											return app.Sup().
												Body(
													app.A().Href(source).Text(fmt.Sprintf("[%d]", i+1)),
												)
										}),
									)
							}),
						),
				),
		)
}

func (c *IndexPage) reset(ctx app.Context) {
	slog.InfoContext(ctx.Context, "IndexPage: reset")
	c.tapEvents = nil
	c.bpm = 0
	ctx.Update()
}

func (c *IndexPage) tapToTheBeat(ctx app.Context) {
	slog.InfoContext(ctx.Context, "IndexPage: tapToTheBeat")

	cooldownPeriod := 3 * time.Second
	maxEvents := 15
	now := time.Now()

	if len(c.tapEvents) > 0 {
		if now.Sub(c.tapEvents[len(c.tapEvents)-1]) > cooldownPeriod {
			slog.InfoContext(ctx, "IndexPage: tapToTheBeat: Cooled down; resetting.")
			c.tapEvents = nil
		}
	}

	c.tapEvents = append(c.tapEvents, now)
	for len(c.tapEvents) > maxEvents {
		c.tapEvents = c.tapEvents[1:]
	}

	slog.InfoContext(ctx, "IndexPage: tapToTheBeat: tapEvents updated.", "tapEvents", c.tapEvents)

	bpm := uint(0)
	if len(c.tapEvents) >= 2 {
		var distances []time.Duration
		for i := 1; i < len(c.tapEvents); i++ {
			distance := c.tapEvents[i].Sub(c.tapEvents[i-1])
			distances = append(distances, distance)
		}

		sumOfDistances := time.Duration(0)
		for _, distance := range distances {
			sumOfDistances += distance
		}
		interval := sumOfDistances / time.Duration(len(distances))
		slog.InfoContext(ctx, "IndexPage: tapToTheBeat: interval updated.", "interval", interval)
		bpm = uint((60 * time.Second) / interval)
	}
	slog.InfoContext(ctx, "IndexPage: tapToTheBeat: bpm updated.", "bpm", bpm)
	c.bpm = bpm

	ctx.Update()
}

type ChartData struct {
	Dances      []dance.Dance
	DanceNames  []string
	DanceStyles []string
	MinimumBPM  uint
	MaximumBPM  uint
}

func createChartData(dances []dance.Dance) ChartData {
	chartData := ChartData{}

	danceMap := map[string]bool{}
	styleMap := map[string]bool{}
	for _, dance := range dances {
		if dance.MinBPM == 0 || dance.MaxBPM == 0 {
			continue
		}

		danceMap[dance.Name] = true
		styleMap[dance.Style] = true

		if chartData.MinimumBPM == 0 || dance.MinBPM < chartData.MinimumBPM {
			chartData.MinimumBPM = dance.MinBPM
		}
		if chartData.MaximumBPM == 0 || dance.MaxBPM > chartData.MaximumBPM {
			chartData.MaximumBPM = dance.MaxBPM
		}

		chartData.Dances = append(chartData.Dances, dance)
	}

	for key := range danceMap {
		chartData.DanceNames = append(chartData.DanceNames, key)
	}
	sort.Strings(chartData.DanceNames)

	for key := range styleMap {
		chartData.DanceStyles = append(chartData.DanceStyles, key)
	}
	sort.Strings(chartData.DanceStyles)

	sort.Slice(chartData.Dances, func(i, j int) bool {
		return chartData.Dances[i].MinBPM < chartData.Dances[j].MinBPM
	})

	return chartData
}
