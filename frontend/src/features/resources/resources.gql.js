import { gql } from '@apollo/client'

const RESOURCE_FIELDS = gql`
  fragment ResourceFields on Resource {
    id
    name
    birthdate
    phone
    email
    status
    skillIds
    street
    number
    block
    flat
    zipCode
    city
    county
    country
    drivingLicence
    car
    availability
    createdBy
    createdAt
    modifiedBy
    modifiedAt
  }
`

export const RESOURCES_QUERY = gql`
  ${RESOURCE_FIELDS}
  query Resources {
    resources {
      ...ResourceFields
    }
  }
`

export const RESOURCE_QUERY = gql`
  ${RESOURCE_FIELDS}
  query Resource($id: ID!) {
    resource(id: $id) {
      ...ResourceFields
    }
  }
`

export const CREATE_RESOURCE_MUTATION = gql`
  ${RESOURCE_FIELDS}
  mutation CreateResource($input: CreateResourceInput!) {
    createResource(input: $input) {
      ...ResourceFields
    }
  }
`

export const UPDATE_RESOURCE_MUTATION = gql`
  ${RESOURCE_FIELDS}
  mutation UpdateResource($id: ID!, $input: UpdateResourceInput!) {
    updateResource(id: $id, input: $input) {
      ...ResourceFields
    }
  }
`

export const DELETE_RESOURCE_MUTATION = gql`
  mutation DeleteResource($id: ID!) {
    deleteResource(id: $id)
  }
`

export const TOGGLE_RESOURCE_SKILL_MUTATION = gql`
  ${RESOURCE_FIELDS}
  mutation ToggleResourceSkill($resourceId: ID!, $skillId: ID!) {
    toggleResourceSkill(resourceId: $resourceId, skillId: $skillId) {
      ...ResourceFields
    }
  }
`

export const BLOCK_RESOURCE_MUTATION = gql`
  ${RESOURCE_FIELDS}
  mutation BlockResource($id: ID!) {
    blockResource(id: $id) {
      ...ResourceFields
    }
  }
`

export const RESOURCE_COMMENTS_QUERY = gql`
  query ResourceComments($resourceId: ID!) {
    resourceComments(resourceId: $resourceId) {
      id
      author
      text
      at
    }
  }
`

export const ADD_RESOURCE_COMMENT_MUTATION = gql`
  mutation AddResourceComment($input: AddCommentInput!) {
    addResourceComment(input: $input) {
      id
      author
      text
      at
    }
  }
`
