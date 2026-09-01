import { useQuery } from '@apollo/client/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { REPORTS_QUERY } from '../reports.gql.js'
import useChartPalette from '../useChartPalette.js'
import './Reports.css'

// Polling is what makes this page "live": every mutation elsewhere in the app
// shows up here within one interval without a manual refresh.
const POLL_INTERVAL_MS = 15000

const STATUS_LABELS = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
}

const AVAILABILITY_LABELS = {
  ASAP: 'ASAP',
  ONE_WEEK: '1 week',
  TWO_WEEKS: '2 weeks',
  THREE_WEEKS: '3 weeks',
}

export default function Reports() {
  const palette = useChartPalette()
  const { data, loading, error } = useQuery(REPORTS_QUERY, {
    pollInterval: POLL_INTERVAL_MS,
  })

  const reports = data?.reports
  const summary = reports?.summary
  const staffing = reports?.projectStaffing ?? []
  const skillDemand = reports?.skillDemand ?? []
  const allocation = reports?.allocation

  const axisStyle = { fill: palette.text, fontSize: 12 }
  const tooltipStyle = {
    background: palette.surface,
    border: `1px solid ${palette.grid}`,
    borderRadius: 6,
    color: palette.textStrong,
    fontSize: 13,
  }

  const staffingData = staffing.map(p => ({
    name: p.projectName,
    Needed: p.totalNeeded,
    Assigned: p.totalAssigned,
  }))

  // Only skills anyone actually asked for or can supply — an untouched skill
  // list would otherwise pad the chart with empty columns.
  const demandData = skillDemand
    .filter(s => s.demand > 0 || s.supply > 0)
    .map(s => ({ name: s.skillName, Demand: s.demand, Supply: s.supply }))

  const allocationData = allocation
    ? [
        { name: 'Free', value: allocation.free },
        { name: 'Assigned', value: allocation.assigned },
        { name: 'Blacklisted', value: allocation.blacklisted },
      ].filter(d => d.value > 0)
    : []

  const availabilityData = (allocation?.byAvailability ?? []).map(b => ({
    name: b.availability ? AVAILABILITY_LABELS[b.availability] ?? b.availability : 'Not set',
    Resources: b.count,
  }))

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="reports-title">Reports</h2>
        <p className="reports-subtitle">
          Live staffing overview · refreshes every {POLL_INTERVAL_MS / 1000}s
        </p>
      </div>

      {loading && !reports && <p className="loading-state">Loading reports…</p>}
      {error && <p className="error-state">Failed to load reports: {error.message}</p>}

      {reports && (
        <>
          <section className="reports-kpis">
            <Kpi label="Projects" value={summary.totalProjects} />
            <Kpi label="Active" value={summary.activeProjects} />
            <Kpi label="Resources" value={summary.totalResources} />
            <Kpi label="Open positions" value={summary.openPositions} emphasis={summary.openPositions > 0} />
            <Kpi label="Fill rate" value={`${summary.fillRate.toFixed(0)}%`} />
            <Kpi label="Fully staffed" value={summary.fullyStaffedProjects} />
          </section>

          <section className="reports-card">
            <h3 className="reports-card-title">Staffing gap per project</h3>
            {staffingData.length === 0 ? (
              <p className="reports-empty">No projects yet.</p>
            ) : (
              <>
                <ChartLegend
                  items={[
                    { label: 'Needed', color: palette.series[0] },
                    { label: 'Assigned', color: palette.series[1] },
                  ]}
                />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={staffingData} barGap={2} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke={palette.grid} vertical={false} />
                    <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={{ stroke: palette.grid }} />
                    <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: palette.grid }} />
                    <Bar dataKey="Needed" fill={palette.series[0]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Assigned" fill={palette.series[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <StaffingTable staffing={staffing} />
              </>
            )}
          </section>

          <section className="reports-card">
            <h3 className="reports-card-title">Demand vs supply per skill</h3>
            {demandData.length === 0 ? (
              <p className="reports-empty">No skill requirements set yet.</p>
            ) : (
              <>
                <ChartLegend
                  items={[
                    { label: 'Demand', color: palette.series[0] },
                    { label: 'Supply', color: palette.series[1] },
                  ]}
                />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demandData} barGap={2} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke={palette.grid} vertical={false} />
                    <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={{ stroke: palette.grid }} />
                    <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: palette.grid }} />
                    <Bar dataKey="Demand" fill={palette.series[0]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Supply" fill={palette.series[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </section>

          <div className="reports-row">
            <section className="reports-card">
              <h3 className="reports-card-title">Resource allocation</h3>
              {allocationData.length === 0 ? (
                <p className="reports-empty">No resources yet.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={90}
                        stroke={palette.surface}
                        strokeWidth={2}
                      >
                        {allocationData.map((entry, i) => (
                          <Cell key={entry.name} fill={palette.series[i % palette.series.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Values live in the legend so identity never rests on colour
                      alone — also the relief the light-mode contrast check asks for. */}
                  <ChartLegend
                    items={allocationData.map((d, i) => ({
                      label: d.name,
                      value: d.value,
                      color: palette.series[i % palette.series.length],
                    }))}
                  />
                </>
              )}
            </section>

            <section className="reports-card">
              <h3 className="reports-card-title">Availability of resources</h3>
              {availabilityData.length === 0 ? (
                <p className="reports-empty">No resources yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={availabilityData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke={palette.grid} vertical={false} />
                    <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={{ stroke: palette.grid }} />
                    <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: palette.grid }} />
                    <Bar dataKey="Resources" fill={palette.series[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, emphasis }) {
  return (
    <div className={`reports-kpi${emphasis ? ' is-emphasis' : ''}`}>
      <span className="reports-kpi-value">{value}</span>
      <span className="reports-kpi-label">{label}</span>
    </div>
  )
}

function ChartLegend({ items }) {
  return (
    <ul className="reports-legend">
      {items.map(item => (
        <li key={item.label} className="reports-legend-item">
          <span className="reports-legend-swatch" style={{ background: item.color }} />
          {item.label}
          {item.value !== undefined && <strong className="reports-legend-value">{item.value}</strong>}
        </li>
      ))}
    </ul>
  )
}

// The table view behind the staffing chart: exact per-skill numbers, and the
// non-colour route to the same information.
function StaffingTable({ staffing }) {
  return (
    <div className="table-wrapper reports-table-wrapper">
      <table className="reports-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Needed</th>
            <th>Assigned</th>
            <th>Per-skill breakdown</th>
          </tr>
        </thead>
        <tbody>
          {staffing.map(p => (
            <tr key={p.projectId}>
              <td className="cell-primary">{p.projectName}</td>
              <td>{STATUS_LABELS[p.status] ?? p.status}</td>
              <td>{p.totalNeeded}</td>
              <td>{p.totalAssigned}</td>
              <td>
                {p.requirements.length === 0 ? (
                  <span className="reports-muted">No requirements set</span>
                ) : (
                  <div className="reports-req-chips">
                    {p.requirements.map(r => (
                      <span
                        key={r.skillId}
                        className={`reports-req-chip${r.filled >= r.needed ? ' is-met' : ''}`}
                      >
                        {r.skillName} {r.filled}/{r.needed}
                      </span>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
