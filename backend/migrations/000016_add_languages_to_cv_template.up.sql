-- Adds a Languages section to the seeded "Classic" template. Only touches the
-- untouched original so a template the user has since edited is left alone.
UPDATE cv_templates
SET html = $tpl$<article class="cv">
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

  {{ if or .Resource.DrivingLicence .Resource.Car }}
  <section class="cv-section">
    <h2>Additional</h2>
    <ul>
      {{ if .Resource.DrivingLicence }}<li>Driving licence</li>{{ end }}
      {{ if .Resource.Car }}<li>Own car</li>{{ end }}
    </ul>
  </section>
  {{ end }}
</article>$tpl$,
    modified_at = NOW()
WHERE name = 'Classic'
  AND html NOT LIKE '%.Resource.Languages%';
