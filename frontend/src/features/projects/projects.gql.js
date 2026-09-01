import { gql } from '@apollo/client'

export const PROJECTS_QUERY = gql`
  query Projects {
    projects {
      id
      name
      contactPerson
      phone
      email
      status
      skillIds
      requirements {
        skillId
        skillName
        needed
        filled
      }
      createdBy
      createdAt
      modifiedBy
      modifiedAt
    }
  }
`

export const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      contactPerson
      phone
      email
      status
      skillIds
      requirements {
        skillId
        skillName
        needed
        filled
      }
      createdBy
      createdAt
      modifiedBy
      modifiedAt
    }
  }
`

export const DELETE_PROJECT_MUTATION = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`

export const TOGGLE_PROJECT_SKILL_MUTATION = gql`
  mutation ToggleProjectSkill($projectId: ID!, $skillId: ID!) {
    toggleProjectSkill(projectId: $projectId, skillId: $skillId) {
      id
      skillIds
    }
  }
`

export const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      status
    }
  }
`

export const SET_PROJECT_REQUIREMENT_MUTATION = gql`
  mutation SetProjectRequirement($input: SetProjectRequirementInput!) {
    setProjectRequirement(input: $input) {
      id
      requirements {
        skillId
        skillName
        needed
        filled
      }
    }
  }
`

export const REMOVE_PROJECT_REQUIREMENT_MUTATION = gql`
  mutation RemoveProjectRequirement($projectId: ID!, $skillId: ID!) {
    removeProjectRequirement(projectId: $projectId, skillId: $skillId) {
      id
      requirements {
        skillId
        skillName
        needed
        filled
      }
    }
  }
`

export const PROJECT_COMMENTS_QUERY = gql`
  query ProjectComments($projectId: ID!) {
    projectComments(projectId: $projectId) {
      id
      author
      text
      at
    }
  }
`

export const ADD_PROJECT_COMMENT_MUTATION = gql`
  mutation AddProjectComment($input: AddCommentInput!) {
    addProjectComment(input: $input) {
      id
      author
      text
      at
    }
  }
`
