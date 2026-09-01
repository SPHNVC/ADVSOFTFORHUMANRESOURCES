import { gql } from '@apollo/client'

const CV_TEMPLATE_FIELDS = gql`
  fragment CvTemplateFields on CvTemplate {
    id
    name
    description
    html
    isDefault
    createdAt
    modifiedAt
  }
`

export const CV_TEMPLATES_QUERY = gql`
  ${CV_TEMPLATE_FIELDS}
  query CvTemplates {
    cvTemplates {
      ...CvTemplateFields
    }
  }
`

export const RENDER_CV_QUERY = gql`
  query RenderCv($resourceId: ID!, $templateId: ID!, $format: CvFormat!) {
    renderCv(resourceId: $resourceId, templateId: $templateId, format: $format) {
      resourceId
      templateId
      fileName
      html
      docxBase64
    }
  }
`

export const CREATE_CV_TEMPLATE_MUTATION = gql`
  ${CV_TEMPLATE_FIELDS}
  mutation CreateCvTemplate($input: CreateCvTemplateInput!) {
    createCvTemplate(input: $input) {
      ...CvTemplateFields
    }
  }
`

export const UPDATE_CV_TEMPLATE_MUTATION = gql`
  ${CV_TEMPLATE_FIELDS}
  mutation UpdateCvTemplate($id: ID!, $input: UpdateCvTemplateInput!) {
    updateCvTemplate(id: $id, input: $input) {
      ...CvTemplateFields
    }
  }
`

export const DELETE_CV_TEMPLATE_MUTATION = gql`
  mutation DeleteCvTemplate($id: ID!) {
    deleteCvTemplate(id: $id)
  }
`
