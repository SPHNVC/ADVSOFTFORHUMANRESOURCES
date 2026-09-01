import { gql } from '@apollo/client'

const RESOURCE_ACTIVITY_FIELDS = gql`
  fragment ResourceActivityFields on ResourceActivity {
    id
    resourceId
    name
    description
    startDate
    endDate
  }
`

export const RESOURCE_ACTIVITIES_QUERY = gql`
  ${RESOURCE_ACTIVITY_FIELDS}
  query ResourceActivities($resourceId: ID!) {
    resourceActivities(resourceId: $resourceId) {
      ...ResourceActivityFields
    }
  }
`

export const CREATE_RESOURCE_ACTIVITY_MUTATION = gql`
  ${RESOURCE_ACTIVITY_FIELDS}
  mutation CreateResourceActivity($input: CreateResourceActivityInput!) {
    createResourceActivity(input: $input) {
      ...ResourceActivityFields
    }
  }
`

export const UPDATE_RESOURCE_ACTIVITY_MUTATION = gql`
  ${RESOURCE_ACTIVITY_FIELDS}
  mutation UpdateResourceActivity($id: ID!, $input: UpdateResourceActivityInput!) {
    updateResourceActivity(id: $id, input: $input) {
      ...ResourceActivityFields
    }
  }
`

export const DELETE_RESOURCE_ACTIVITY_MUTATION = gql`
  mutation DeleteResourceActivity($id: ID!) {
    deleteResourceActivity(id: $id)
  }
`
