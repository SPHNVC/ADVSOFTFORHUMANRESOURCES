import { gql } from '@apollo/client'

export const SKILLS_QUERY = gql`
  query Skills {
    skills {
      id
      name
      description
    }
  }
`

export const CREATE_SKILL_MUTATION = gql`
  mutation CreateSkill($input: CreateSkillInput!) {
    createSkill(input: $input) {
      id
      name
      description
    }
  }
`

export const DELETE_SKILL_MUTATION = gql`
  mutation DeleteSkill($id: ID!) {
    deleteSkill(id: $id)
  }
`
