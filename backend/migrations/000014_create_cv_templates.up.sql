CREATE TABLE IF NOT EXISTS cv_templates (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT,
    html         TEXT NOT NULL,
    is_default   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one default template. Partial index costs nothing on non-default rows.
CREATE UNIQUE INDEX idx_cv_templates_single_default
    ON cv_templates (is_default)
    WHERE is_default;

INSERT INTO cv_templates (name, description, html, is_default)
VALUES (
    'Classic',
    'Single-column layout with a header band, skills as chips and a dated activity list.',
    $tpl$<article class="cv">
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
    TRUE
);
