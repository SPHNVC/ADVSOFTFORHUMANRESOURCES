import { gql } from '@apollo/client'

const SKILL_REQUIREMENT_FIELDS = gql`
  fragment SkillRequirementFields on SkillRequirement {
    skillId
    skillName
    needed
    filled
  }
`

export const REPORTS_QUERY = gql`
  ${SKILL_REQUIREMENT_FIELDS}
  query Reports {
    reports {
      summary {
        totalProjects
        activeProjects
        totalResources
        openPositions
        fillRate
        fullyStaffedProjects
      }
      projectStaffing {
        projectId
        projectName
        status
        totalNeeded
        totalAssigned
        requirements { ...SkillRequirementFields }
      }
      skillDemand {
        skillId
        skillName
        demand
        supply
        assignedSupply
      }
      allocation {
        free
        assigned
        blacklisted
        byAvailability {
          availability
          count
        }
      }
    }
  }
`
