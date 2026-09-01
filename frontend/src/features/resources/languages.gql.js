import { gql } from '@apollo/client'

const RESOURCE_LANGUAGE_FIELDS = gql`
  fragment ResourceLanguageFields on ResourceLanguage {
    id
    resourceId
    languageId
    name
    level
  }
`

export const LANGUAGES_QUERY = gql`
  query Languages {
    languages {
      id
      name
    }
  }
`

export const RESOURCE_LANGUAGES_QUERY = gql`
  ${RESOURCE_LANGUAGE_FIELDS}
  query ResourceLanguages($resourceId: ID!) {
    resourceLanguages(resourceId: $resourceId) {
      ...ResourceLanguageFields
    }
  }
`

export const CREATE_LANGUAGE_MUTATION = gql`
  mutation CreateLanguage($input: CreateLanguageInput!) {
    createLanguage(input: $input) {
      id
      name
    }
  }
`

export const DELETE_LANGUAGE_MUTATION = gql`
  mutation DeleteLanguage($id: ID!) {
    deleteLanguage(id: $id)
  }
`

export const SET_RESOURCE_LANGUAGE_MUTATION = gql`
  ${RESOURCE_LANGUAGE_FIELDS}
  mutation SetResourceLanguage($input: SetResourceLanguageInput!) {
    setResourceLanguage(input: $input) {
      ...ResourceLanguageFields
    }
  }
`

export const REMOVE_RESOURCE_LANGUAGE_MUTATION = gql`
  mutation RemoveResourceLanguage($resourceId: ID!, $languageId: ID!) {
    removeResourceLanguage(resourceId: $resourceId, languageId: $languageId)
  }
`

/**
 * CEFR levels, lowest to highest. Labels are kept short so the dropdown stays
 * narrow enough to leave room for the Remove button; the full wording is
 * rendered on the generated CV.
 */
export const LANGUAGE_LEVELS = [
  { value: 'A1', label: 'A1 — Beginner' },
  { value: 'A2', label: 'A2 — Elementary' },
  { value: 'B1', label: 'B1 — Intermediate' },
  { value: 'B2', label: 'B2 — Upper int.' },
  { value: 'C1', label: 'C1 — Advanced' },
  { value: 'C2', label: 'C2 — Proficient' },
  { value: 'NATIVE', label: 'Native' },
]
