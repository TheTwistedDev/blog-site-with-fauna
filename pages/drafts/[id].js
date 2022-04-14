import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import axios from 'axios'
import { fetcher, isAuthorized } from '../../lib/utils'
import { Layout } from '../../sections/index'
import { Editor } from '../../components/index'
import toast from 'react-hot-toast'

import {
  HiOutlineCloud,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
} from 'react-icons/hi'

const Draft = ({ initialData }) => {
  const router = useRouter()
  const { data: session } = useSession()
  const { data, error, mutate } = useSWR(
    () => (session?.user ? `/api/posts/${router?.query?.id}` : null),
    fetcher,
    initialData
  )
  const [publishing, setPublishing] = useState(false)
  const [savingStatus, setSavingStatus] = useState('saved')

  const handleOnPublish = async (title, content) => {
    let toastId
    try {
      if (title) {
        setPublishing(true)
        toastId = toast.loading('Publishing...')
        // Perform query
        const { data } = await axios.patch(
          `/api/posts/publish/${router?.query?.id}`,
          {
            title,
            content,
          }
        )
        // Update cache, but disable the revalidation
        mutate(data, false);
        // Display success message
        toast.success('Redirecting...', { id: toastId })
        // Redirect to post page
        router.push(`/posts/${data.slug}`)
      } else {
        toast.error('Looks like you forgot to add a title!')
      }
    } catch (error) {
      // Display error message
      toast.error('Unable to publish post', { id: toastId })
      setPublishing(false)
    }
  }

  const handleOnChange = async (title, content) => {
    // Saved data
    try {
      setSavingStatus('saving')
      // Perform query
      const { data } = await axios.patch(`/api/posts/${router?.query?.id}`, {
        title,
        content,
        author: session.user,
      })
      // Update cache, but disable the revalidation
      mutate(data, false);
      setSavingStatus('saved')
    } catch (error) {
      setSavingStatus('error')
    }
  }

  const handleOnDelete = async () => {
    if (window.confirm('Do you really want to delete this draft?')) {
      let toastId;
      try {
        // Display loading state...
        toastId = toast.loading('Deleting...')
        // Perform query
        await axios.delete(`/api/posts/${data.id}`)
        // Update cache, but disable the revalidation
        mutate(null, false)
        // Remove toast
        toast.dismiss(toastId)
        // Redirect
        router.push(`/drafts/me`)
      } catch (error) {
        // Display error message
        toast.error('Unable to delete this draft', { id: toastId })
      }
    }
  }

  if (error) {
    return (
      <Layout pageMeta={{ title: 'Error' }}>
        <div className="flex justify-center my-12">
          <p className="flex items-center justify-center w-full max-w-screen-sm p-4 space-x-1 text-lg text-center text-red-500 bg-gray-100 rounded-md dark:bg-gray-800">
            <HiOutlineExclamationCircle className="flex-shrink-0 w-6 h-6" />
            <span>Unable to retrieve post!</span>
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout pageMeta={{ title: 'Write blog post' }}>
      {data ? (
        <div className="w-full max-w-screen-lg py-8 mx-auto sm:py-12">
          <div className="flex items-center justify-start mb-6 space-x-4">
            <p className="flex items-center px-2 py-1 space-x-1 text-gray-500 bg-gray-100 rounded-md dark:bg-gray-800">
              {savingStatus === 'error' ? (
                <>
                  <HiOutlineExclamationCircle className="flex-shrink-0 w-6 h-6 text-red-500 dark:text-red-400" />
                  <span className="text-red-500 dark:text-red-400">
                    Saving failed
                  </span>
                </>
              ) : savingStatus === 'saving' ? (
                <>
                  <HiOutlineRefresh className="flex-shrink-0 w-6 h-6 animate-spin" />
                  <span>Saving</span>
                </>
              ) : savingStatus === 'saved' ? (
                <>
                  <HiOutlineCloud className="flex-shrink-0 w-6 h-6" />
                  <span>Saved</span>
                </>
              ) : null}
            </p>
          </div>

          <Editor
            initialData={data}
            showDeleteButton={true}
            showPublishButton={true}
            disabled={publishing}
            onChange={handleOnChange}
            onPublish={handleOnPublish}
            onDelete={handleOnDelete}
          />
        </div>
      ) : null}
    </Layout>
  )
}

export const getServerSideProps = isAuthorized

export default Draft