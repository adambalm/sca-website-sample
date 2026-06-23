import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import type {StructureResolver} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {presentationTool} from 'sanity/presentation'
import {defineLocations, defineDocuments} from 'sanity/presentation'
import {schemaTypes} from './schemaTypes'

const PREVIEW_URL = import.meta.env?.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:4321'

const structure: StructureResolver = (S, context) => {
  const isAdmin = context.currentUser?.roles.find(
    (role) => role.name === 'administrator'
  )

  const contentItems = [
    S.documentTypeListItem('news').title('News'),
    S.documentTypeListItem('page').title('Pages'),
    S.documentTypeListItem('event').title('Events'),
    S.documentTypeListItem('mediaGallery').title('Media Gallery'),
    S.documentTypeListItem('alumniStory').title('Alumni Stories'),
  ]

  const peopleItems = [
    S.documentTypeListItem('person').title('People'),
    S.documentTypeListItem('department').title('Departments'),
    S.documentTypeListItem('program').title('Programs'),
    S.documentTypeListItem('studentProject').title('Student Projects'),
  ]

  const admissionsItems = [
    S.documentTypeListItem('admissionsPath').title('Admissions Paths'),
    S.documentTypeListItem('boardingFeature').title('Boarding Features'),
  ]

  const settingsItems = [
    S.listItem()
      .id('siteSettings')
      .schemaType('siteSettings')
      .title('Site Settings')
      .child(
        S.editor()
          .id('siteSettings')
          .schemaType('siteSettings')
          .documentId('baae86f4-5368-4250-b8ef-0987b0172908')
      ),
    S.listItem()
      .id('homepageConfig')
      .schemaType('homepageConfig')
      .title('Homepage')
      .child(
        S.editor()
          .id('homepageConfig')
          .schemaType('homepageConfig')
          .documentId('982c9ca4-7743-4972-bc74-7bb8832f0bb0')
      ),
  ]

  const operationsItems = [
    S.documentTypeListItem('scaoBriefingRecord').title('Briefing Records'),
  ]

  const jobPostingItems = [
    S.listItem()
      .title('Open')
      .child(
        S.documentList()
          .title('Open Postings')
          .filter('_type == "jobPosting" && archived != true && (postingEndDate + "T23:59:59Z") >= now()')
          .defaultOrdering([{field: 'postingStartDate', direction: 'desc'}])
      ),
    S.listItem()
      .title('Closed / Archived')
      .child(
        S.documentList()
          .title('Closed and Archived Postings')
          .filter('_type == "jobPosting" && ((postingEndDate + "T23:59:59Z") < now() || archived == true)')
          .defaultOrdering([{field: 'postingEndDate', direction: 'desc'}])
      ),
    S.divider(),
    S.listItem()
      .title('All Job Postings')
      .child(
        S.documentList()
          .title('All Job Postings')
          .filter('_type == "jobPosting"')
          .defaultOrdering([{field: 'postingStartDate', direction: 'desc'}])
      ),
  ]

  // Coach-facing review section: flat filtered lists, review-first ordering
  const basketballReviewItems = [
    S.listItem()
      .title('Needs Review')
      .child(
        S.documentList()
          .title('Needs Review')
          .filter('_type == "alumniStory" && sport == "basketball" && needsCoachReview == true')
      ),
    S.listItem()
      .title('Approved')
      .child(
        S.documentList()
          .title('Approved Alumni')
          .filter('_type == "alumniStory" && sport == "basketball" && needsCoachReview != true')
      ),
    S.divider(),
    S.listItem()
      .title('All Basketball Alumni')
      .child(
        S.documentList()
          .title('All Basketball Alumni')
          .filter('_type == "alumniStory" && sport == "basketball"')
      ),
  ]

  const items = [
    S.listItem()
      .title('Basketball Review')
      .child(S.list().title('Basketball Review').items(basketballReviewItems)),
    S.listItem()
      .title('Content')
      .child(S.list().title('Content').items(contentItems)),
    S.listItem()
      .title('People & Programs')
      .child(S.list().title('People & Programs').items(peopleItems)),
    S.listItem()
      .title('Admissions')
      .child(S.list().title('Admissions').items(admissionsItems)),
    S.listItem()
      .title('Job Postings')
      .child(S.list().title('Job Postings').items(jobPostingItems)),
    S.documentTypeListItem('navigation').title('Navigation'),
    S.divider(),
    S.listItem()
      .title('Settings')
      .child(S.list().title('Settings').items(settingsItems)),
    ...(isAdmin
      ? [
          S.listItem()
            .title('Operations')
            .child(S.list().title('Operations').items(operationsItems)),
        ]
      : []),
  ]

  return S.list().title('SCA').items(items)
}

export default defineConfig({
  name: 'default',
  title: 'sca-website',

  projectId: 'wesg5rw8',
  dataset: 'production',

  plugins: [
    structureTool({structure}),
    visionTool(),
    presentationTool({
      previewUrl: PREVIEW_URL,
      allowOrigins: [
        'http://localhost:*',
        'https://www.springfieldcommonwealthacademy.org',
        'https://springfieldcommonwealthacademy.org',
        'https://sca-website-git-preview-ed-oconnells-projects.vercel.app',
      ],
      resolve: {
        mainDocuments: defineDocuments([
          {
            route: '/',
            filter: '_type == "homepageConfig"',
          },
          {
            route: '/news/:slug',
            filter: '_type == "news" && slug.current == $slug',
          },
          {
            route: '/projects/:id',
            filter: '_type == "studentProject" && _id == $id',
          },
          {
            route: '/careers/:slug',
            filter: '_type == "jobPosting" && slug.current == $slug',
          },
        ]),
        locations: {
          homepageConfig: defineLocations({
            resolve: () => ({
              locations: [{title: 'Homepage', href: '/'}],
            }),
          }),
          news: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{title: doc.title || 'Untitled', href: `/news/${doc.slug}`}]
                : [],
            }),
          }),
          studentProject: defineLocations({
            select: {title: 'title', id: '_id'},
            resolve: (doc) => ({
              locations: [{title: doc?.title || 'Untitled', href: `/projects/${doc?.id}`}],
            }),
          }),
          page: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{title: doc.title || 'Untitled', href: `/${doc.slug}`}]
                : [],
            }),
          }),
          program: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{title: doc.title || 'Untitled', href: `/${doc.slug}`}]
                : [],
            }),
          }),
          jobPosting: defineLocations({
            select: {title: 'positionTitle', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: doc?.slug
                ? [
                    {title: doc.title || 'Untitled posting', href: `/careers/${doc.slug}`},
                    {title: 'Careers index', href: '/careers'},
                  ]
                : [{title: 'Careers index', href: '/careers'}],
            }),
          }),
        },
      },
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
