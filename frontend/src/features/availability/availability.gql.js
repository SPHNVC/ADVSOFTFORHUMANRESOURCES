import { gql } from '@apollo/client'

export const RESOURCE_ALLOCATIONS_QUERY = gql`
  query ResourceAllocations {
    resourceAllocations {
      resource {
        id
        name
        phone
        email
        status
        availability
        skillIds
      }
      projectCount
      projectNames
    }
  }
`

export const MATCH_PROJECTS_QUERY = gql`
  query MatchProjects($resourceId: ID!, $filter: ProjectMatchFilter) {
    matchProjects(resourceId: $resourceId, filter: $filter) {
      matchScore
      matchingSkillIds
      openPositions
      project {
        id
        name
        status
        requirements {
          skillId
          skillName
          needed
          filled
        }
      }
    }
  }
`
