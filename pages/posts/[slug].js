import ReactMarkdown from 'react-markdown'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import axios from 'axios'
import  faunaQueries  from '../../lib/fauna'
import { formatDate } from '../../lib/utils'
import { Layout } from '../../sections/index'
import { MDComponents } from '../../components/index'
import { HiOutlinePencil, HiOutlineTrash} from 'react-icons/hi'

const Post = ({
  id = '',
  title = '',
  content = '',
  author = null,
  published_at = '',
}) => {
  const router = useRouter()
  const {data: session} = useSession()

  const deletePost = async () => {
    if (window.confirm('Do you really want to delete this post?')) {
      let toastId
      try {
        // Display loading state...
        toastId = toast.loading('Deleting...')
        // Perform query
        await axios.delete(`/api/posts/${id}`)
        // Remove toast
        toast.dismiss(toastId)
        // Redirect
        router.push(`/posts`)
      } catch (error) {
        // Display error message
        toast.error('Unable to delete post', { id: toastId })
      }
    }
  }

  const pageMeta = {
    type: 'article',
    title,
    description: content.slice(0, 250),
    date: published_at ? new Date(published_at).toISOString() : '',
  }

  return (
    <Layout pageMeta={pageMeta}>
      {router.isFallback ? (
        <p className="py-12 text-lg text-center">Loading...</p>
      ) : (
        <article className="max-w-screen-lg py-12 mx-auto space-y-16">
          <header className="space-y-8">
            <h1 className="w-full max-w-screen-md text-3xl font-extrabold leading-tight lg:text-6xl md:text-5xl sm:text-4xl">
              {title}
            </h1>

            <div className="flex flex-col py-6 space-y-4 border-t border-b sm:flex-row sm:justify-between sm:items-center sm:space-y-0 sm:space-x-4 dark:border-gray-700">
              {/* Author */}
              <div className="flex items-center space-x-2">
                <img
                  src={author?.image}
                  alt={author?.name}
                  className="flex-shrink-0 w-16 h-16 rounded-full"
                />
                <div>
                  <p className="font-bold">{author?.name}</p>
                  <p className="text-gray-500">{formatDate(published_at)}</p>
                </div>
              </div>

              {/* Actions */}
              {session && session.user.email === author.email ? (
                <div className="flex items-center space-x-1">
                  <Link href={`/edit/${id}`}>
                    <a className="flex items-center px-2 py-1 space-x-1 bg-transparent rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50">
                      <HiOutlinePencil className="flex-shrink-0 w-5 h-5" />
                      <span>Edit</span>
                    </a>
                  </Link>
                  <button
                    type="button"
                    onClick={deletePost}
                    className="flex items-center px-2 py-1 space-x-1 bg-transparent rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
                  >
                    <HiOutlineTrash className="flex-shrink-0 w-5 h-5" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <main className="prose sm:prose-lg lg:prose-xl dark:prose-dark max-w-none">
            <ReactMarkdown components={MDComponents} children={content} />
          </main>
        </article>
      )}
    </Layout>
  )
}

export async function getStaticPaths() {
  let slugs = [],
    cursor = null

  do {
    const { data, after } = await faunaQueries.getAllSlugs({ after: cursor })
    slugs = [...slugs, ...data]
    cursor = after
  } while (cursor)

  return {
    // Existing posts are rendered to HTML at build time
    paths: slugs?.map(slug => ({
      params: { slug },
    })),
    // Enable statically generating additional pages
    fallback: true,
  }
}

export async function getStaticProps({ params }) {
  try {
    const data = await faunaQueries.getPostBySlug(params.slug)

    return {
      props: data,
      // Next.js will attempt to re-generate the page:
      // - When a request comes in
      // - At most once every second
      revalidate: 1, // In seconds
    }
  } catch (error) {
    return { notFound: true }
  }
}

export default Post

