import { gql } from '@apollo/client'

export const PROJECT_ASSIGNMENTS_QUERY = gql`
  query ProjectAssignments($projectId: ID!) {
    projectAssignments(projectId: $projectId) {
      id
      projectId
      resourceId
      resourceName
      resourcePhone
      resourceEmail
      skillId
      assignedAt
    }
  }
`

export const MATCH_RESOURCES_QUERY = gql`
  query MatchResources($projectId: ID!, $filter: MatchFilter) {
    matchResources(projectId: $projectId, filter: $filter) {
      matchScore
      matchingSkillIds
      assignedProjectCount
      resource {
        id
        name
        phone
        email
        status
        availability
        skillIds
      }
    }
  }
`

export const ASSIGN_RESOURCE_MUTATION = gql`
  mutation AssignResource($projectId: ID!, $resourceId: ID!, $skillId: ID) {
    assignResource(projectId: $projectId, resourceId: $resourceId, skillId: $skillId) {
      id
      resourceId
      resourceName
      resourcePhone
      resourceEmail
      skillId
      assignedAt
    }
  }
`

export const UNASSIGN_RESOURCE_MUTATION = gql`
  mutation UnassignResource($projectId: ID!, $resourceId: ID!) {
    unassignResource(projectId: $projectId, resourceId: $resourceId)
  }
`
