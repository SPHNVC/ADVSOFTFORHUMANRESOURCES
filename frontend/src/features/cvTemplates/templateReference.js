/**
 * Reference data for the template editor.
 *
 * Templates are rendered server-side by Go's html/template. The tokens listed
 * here mirror the `cvData` struct in backend/internal/service/cv.go — keep the
 * two in sync when adding fields.
 */

/** Prefilled body for a brand-new template. */
export const STARTER_TEMPLATE = `<article class="cv">
  <header class="cv-header">
    <h1>{{ .Resource.Name }}</h1>
    <p class="cv-contact">
      {{ with .Resource.Email }}<span>{{ . }}</span>{{ end }}
      {{ with .Resource.Phone }}<span>{{ . }}</span>{{ end }}
      {{ with .Resource.Location }}<span>{{ . }}</span>{{ end }}
    </p>
  </header>

  {{ if .Resource.Skills }}
  <section class="cv-section">
    <h2>Skills</h2>
    <ul class="cv-chips">
      {{ range .Resource.Skills }}<li>{{ .Name }}</li>{{ end }}
    </ul>
  </section>
  {{ end }}

  {{ if .Resource.Languages }}
  <section class="cv-section">
    <h2>Languages</h2>
    <ul class="cv-languages">
      {{ range .Resource.Languages }}
      <li><span class="cv-lang-name">{{ .Name }}</span><span class="cv-lang-level">{{ .Label }} ({{ .Level }})</span></li>
      {{ end }}
    </ul>
  </section>
  {{ end }}

  {{ if .Resource.Activities }}
  <section class="cv-section">
    <h2>Experience</h2>
    {{ range .Resource.Activities }}
    <div class="cv-item">
      <div class="cv-item-head">
        <h3>{{ .Name }}</h3>
        <span class="cv-dates">{{ .StartDate }} &ndash; {{ .EndDate }}</span>
      </div>
      {{ with .Description }}<p>{{ . }}</p>{{ end }}
    </div>
    {{ end }}
  </section>
  {{ end }}
</article>
`

export const TEMPLATE_FIELDS = [
  {
    label: 'Personal',
    fields: [
      { token: '{{ .Resource.Name }}', hint: 'Full name' },
      { token: '{{ .Resource.Email }}', hint: 'Email address' },
      { token: '{{ .Resource.Phone }}', hint: 'Phone number' },
      { token: '{{ .Resource.Birthdate }}', hint: 'Birthdate (YYYY-MM-DD)' },
      { token: '{{ .Resource.Age }}', hint: 'Age in years' },
      { token: '{{ .Resource.Location }}', hint: 'City, county, country' },
      { token: '{{ .Resource.Address }}', hint: 'Street address' },
      { token: '{{ .Resource.City }}', hint: 'City' },
      { token: '{{ .Resource.County }}', hint: 'County' },
      { token: '{{ .Resource.Country }}', hint: 'Country' },
      { token: '{{ .Resource.Availability }}', hint: 'Availability label' },
    ],
  },
  {
    label: 'Skills — repeat over the list',
    fields: [
      {
        token:
          '{{ range .Resource.Skills }}\n  <li>{{ .Name }}</li>\n{{ end }}',
        hint: 'Loop over every skill',
      },
      { token: '{{ .Name }}', hint: 'Skill name (inside a range)' },
      { token: '{{ .Description }}', hint: 'Skill description (inside a range)' },
    ],
  },
  {
    label: 'Languages — repeat over the list',
    fields: [
      {
        token:
          '{{ range .Resource.Languages }}\n  <li><span class="cv-lang-name">{{ .Name }}</span><span class="cv-lang-level">{{ .Label }} ({{ .Level }})</span></li>\n{{ end }}',
        hint: 'Loop over every language',
      },
      { token: '{{ .Level }}', hint: 'CEFR code, e.g. C1 (inside a range)' },
      { token: '{{ .Label }}', hint: 'Readable level, e.g. Advanced (inside a range)' },
    ],
  },
  {
    label: 'Activities — repeat over the list',
    fields: [
      {
        token:
          '{{ range .Resource.Activities }}\n  <div class="cv-item">\n    <h3>{{ .Name }}</h3>\n    <span class="cv-dates">{{ .StartDate }} – {{ .EndDate }}</span>\n    <p>{{ .Description }}</p>\n  </div>\n{{ end }}',
        hint: 'Loop over every activity',
      },
      { token: '{{ .StartDate }}', hint: 'Start date MM/YYYY (inside a range)' },
      { token: '{{ .EndDate }}', hint: 'End date MM/YYYY (inside a range)' },
    ],
  },
  {
    label: 'Flags & conditionals',
    fields: [
      {
        token: '{{ if .Resource.DrivingLicence }}Driving licence{{ end }}',
        hint: 'Only render when the resource has a licence',
      },
      {
        token: '{{ if .Resource.Car }}Own car{{ end }}',
        hint: 'Only render when the resource has a car',
      },
      {
        token: '{{ with .Resource.Email }}<span>{{ . }}</span>{{ end }}',
        hint: 'Render only when the field is not empty',
      },
      { token: '{{ .GeneratedAt }}', hint: 'Date the CV was generated' },
    ],
  },
]

/** Sample data used to render the live preview in the editor. */
export const SAMPLE_DATA = {
  Resource: {
    Name: 'Alexandra Ionescu',
    Birthdate: '1991-04-18',
    Age: '34',
    Email: 'alexandra.ionescu@example.com',
    Phone: '+40 721 555 019',
    Location: 'Cluj-Napoca, Cluj, Romania',
    Address: 'Str. Memorandumului 14, Bl. C2, Ap. 7, 400114',
    City: 'Cluj-Napoca',
    County: 'Cluj',
    Country: 'Romania',
    DrivingLicence: true,
    Car: true,
    Availability: '2 weeks',
    Skills: [
      { Name: 'Go', Description: 'Backend services and APIs' },
      { Name: 'React', Description: 'Component architecture' },
      { Name: 'PostgreSQL', Description: 'Schema design and tuning' },
      { Name: 'GraphQL', Description: 'Schema-first API design' },
    ],
    Languages: [
      { Name: 'English', Level: 'C1', Label: 'Advanced' },
      { Name: 'German', Level: 'B1', Label: 'Intermediate' },
      { Name: 'Romanian', Level: 'NATIVE', Label: 'Native speaker' },
    ],
    Activities: [
      {
        Name: 'Senior Fullstack Engineer — Northwind',
        Description:
          'Led the migration of a monolithic REST API to a schema-first GraphQL gateway serving 40k daily users.',
        StartDate: '03/2022',
        EndDate: '11/2025',
      },
      {
        Name: 'Backend Engineer — Lumen Systems',
        Description:
          'Built billing and reporting services in Go, cutting month-end reconciliation from hours to minutes.',
        StartDate: '06/2019',
        EndDate: '02/2022',
      },
    ],
  },
  GeneratedAt: '28 July 2026',
}
