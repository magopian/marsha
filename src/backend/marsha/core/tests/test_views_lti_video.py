"""Test the LTI video view."""
from html import unescape
import json
from logging import Logger
import random
import re
from unittest import mock
import uuid

from django.contrib.staticfiles.storage import staticfiles_storage
from django.test import TestCase

from pylti.common import LTIException
from rest_framework_simplejwt.tokens import AccessToken

from ..factories import (
    ConsumerSiteLTIPassportFactory,
    TimedTextTrackFactory,
    VideoFactory,
)
from ..lti import LTI


# We don't enforce arguments documentation in tests
# pylint: disable=unused-argument


class VideoLTIViewTestCase(TestCase):
    """Test the video view in the ``core`` app of the Marsha project."""

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    def test_views_lti_video_post_instructor(self, mock_get_consumer_site, mock_verify):
        """Validate the format of the response returned by the view for an instructor request."""
        passport = ConsumerSiteLTIPassportFactory()
        video = VideoFactory(
            playlist__lti_id="course-v1:ufr+mathematics+00001",
            playlist__consumer_site=passport.consumer_site,
        )
        data = {
            "resource_link_id": video.lti_id,
            "context_id": video.playlist.lti_id,
            "roles": "instructor",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
            "launch_presentation_locale": "fr",
        }

        mock_get_consumer_site.return_value = passport.consumer_site
        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")

        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        jwt_token = AccessToken(context.get("jwt"))
        self.assertEqual(jwt_token.payload["resource_id"], str(video.id))
        self.assertEqual(jwt_token.payload["user_id"], data["user_id"])
        self.assertEqual(jwt_token.payload["context_id"], data["context_id"])
        self.assertEqual(jwt_token.payload["roles"], [data["roles"]])
        self.assertEqual(jwt_token.payload["locale"], "fr_FR")
        self.assertEqual(
            jwt_token.payload["permissions"],
            {"can_access_dashboard": True, "can_update": True},
        )
        self.assertDictEqual(
            jwt_token.payload["course"],
            {"school_name": "ufr", "course_name": "mathematics", "course_run": "00001"},
        )

        self.assertEqual(context.get("state"), "success")
        self.assertEqual(
            context.get("resource"),
            {
                "active_stamp": None,
                "is_ready_to_show": False,
                "show_download": True,
                "description": video.description,
                "id": str(video.id),
                "upload_state": "pending",
                "timed_text_tracks": [],
                "thumbnail": None,
                "title": video.title,
                "urls": None,
            },
        )
        self.assertEqual(context.get("modelName"), "videos")
        # Make sure we only go through LTI verification once as it is costly (getting passport +
        # signature)
        self.assertEqual(mock_verify.call_count, 1)

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    def test_views_lti_video_post_administrator(
        self, mock_get_consumer_site, mock_verify
    ):
        """Validate the format of the response returned by the view for an admin request."""
        passport = ConsumerSiteLTIPassportFactory()
        video = VideoFactory(
            playlist__lti_id="course-v1:ufr+mathematics+00001",
            playlist__consumer_site=passport.consumer_site,
        )
        data = {
            "resource_link_id": video.lti_id,
            "context_id": video.playlist.lti_id,
            "roles": "administrator",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
            "launch_presentation_locale": "fr",
        }

        mock_get_consumer_site.return_value = passport.consumer_site
        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")

        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        jwt_token = AccessToken(context.get("jwt"))
        self.assertEqual(jwt_token.payload["resource_id"], str(video.id))
        self.assertEqual(jwt_token.payload["user_id"], data["user_id"])
        self.assertEqual(jwt_token.payload["context_id"], data["context_id"])
        self.assertEqual(jwt_token.payload["roles"], [data["roles"]])
        self.assertEqual(jwt_token.payload["locale"], "fr_FR")
        self.assertEqual(
            jwt_token.payload["permissions"],
            {"can_access_dashboard": True, "can_update": True},
        )
        self.assertDictEqual(
            jwt_token.payload["course"],
            {"school_name": "ufr", "course_name": "mathematics", "course_run": "00001"},
        )

        self.assertEqual(context.get("state"), "success")
        self.assertEqual(
            context.get("resource"),
            {
                "active_stamp": None,
                "is_ready_to_show": False,
                "show_download": True,
                "description": video.description,
                "id": str(video.id),
                "upload_state": "pending",
                "timed_text_tracks": [],
                "thumbnail": None,
                "title": video.title,
                "urls": None,
            },
        )
        self.assertEqual(context.get("modelName"), "videos")
        # Make sure we only go through LTI verification once as it is costly (getting passport +
        # signature)
        self.assertEqual(mock_verify.call_count, 1)

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    def test_views_lti_video_read_other_playlist(
        self, mock_get_consumer_site, mock_verify
    ):
        """A video from another portable playlist should have "can_update" set to False."""
        passport = ConsumerSiteLTIPassportFactory(consumer_site__domain="example.com")
        video = VideoFactory(
            playlist__is_portable_to_playlist=True,
            playlist__is_portable_to_consumer_site=True,
            upload_state="ready",
        )
        data = {
            "resource_link_id": video.lti_id,
            "context_id": "another-playlist",
            "roles": "instructor",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
            "launch_presentation_locale": "fr",
        }

        mock_get_consumer_site.return_value = passport.consumer_site
        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")

        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        jwt_token = AccessToken(context.get("jwt"))
        self.assertEqual(
            jwt_token.payload["permissions"],
            {"can_access_dashboard": True, "can_update": False},
        )
        self.assertEqual(context.get("state"), "success")
        self.assertEqual(
            context.get("resource"),
            {
                "active_stamp": None,
                "is_ready_to_show": False,
                "show_download": True,
                "description": video.description,
                "id": str(video.id),
                "upload_state": "ready",
                "timed_text_tracks": [],
                "thumbnail": None,
                "title": video.title,
                "urls": None,
            },
        )
        self.assertEqual(context.get("modelName"), "videos")
        # Make sure we only go through LTI verification once as it is costly (getting passport +
        # signature)
        self.assertEqual(mock_verify.call_count, 1)

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    def test_views_lti_video_post_student_with_video(
        self, mock_get_consumer_site, mock_verify
    ):
        """Validate the format of the response returned by the view for a student request."""
        passport = ConsumerSiteLTIPassportFactory()
        video = VideoFactory(
            playlist__lti_id="course-v1:ufr+mathematics+00001",
            playlist__consumer_site=passport.consumer_site,
            upload_state="ready",
        )
        data = {
            "resource_link_id": video.lti_id,
            "context_id": video.playlist.lti_id,
            "roles": "student",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
        }
        mock_get_consumer_site.return_value = passport.consumer_site

        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")

        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        jwt_token = AccessToken(context.get("jwt"))
        self.assertEqual(jwt_token.payload["resource_id"], str(video.id))
        self.assertEqual(jwt_token.payload["user_id"], data["user_id"])
        self.assertEqual(jwt_token.payload["context_id"], data["context_id"])
        self.assertEqual(jwt_token.payload["roles"], [data["roles"]])
        self.assertEqual(jwt_token.payload["locale"], "en_US")
        self.assertEqual(
            jwt_token.payload["permissions"],
            {"can_access_dashboard": False, "can_update": False},
        )
        self.assertDictEqual(
            jwt_token.payload["course"],
            {"school_name": "ufr", "course_name": "mathematics", "course_run": "00001"},
        )

        self.assertEqual(context.get("state"), "success")
        self.assertEqual(
            context.get("resource"),
            {
                "active_stamp": None,
                "is_ready_to_show": False,
                "show_download": True,
                "description": video.description,
                "id": str(video.id),
                "upload_state": "ready",
                "timed_text_tracks": [],
                "thumbnail": None,
                "title": video.title,
                "urls": None,
            },
        )
        self.assertEqual(context.get("modelName"), "videos")
        # Make sure we only go through LTI verification once as it is costly (getting passport +
        # signature)
        self.assertEqual(mock_verify.call_count, 1)

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    def test_views_lti_video_without_user_id_parameter(
        self, mock_get_consumer_site, mock_verify
    ):
        """Ensure JWT is created if user_id is missing in the LTI request."""
        passport = ConsumerSiteLTIPassportFactory()
        video = VideoFactory(
            playlist__consumer_site=passport.consumer_site, upload_state="ready"
        )
        data = {
            "resource_link_id": video.lti_id,
            "context_id": video.playlist.lti_id,
            "context_title": "mathematics",
            "tool_consumer_instance_name": "ufr",
            "roles": "student",
            "oauth_consumer_key": passport.oauth_consumer_key,
        }
        mock_get_consumer_site.return_value = passport.consumer_site

        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")
        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        jwt_token = AccessToken(context.get("jwt"))
        self.assertEqual(jwt_token.payload["resource_id"], str(video.id))
        self.assertEqual(jwt_token.payload["context_id"], data["context_id"])
        self.assertEqual(jwt_token.payload["roles"], [data["roles"]])
        self.assertEqual(jwt_token.payload["locale"], "en_US")
        self.assertEqual(
            jwt_token.payload["permissions"],
            {"can_access_dashboard": False, "can_update": False},
        )
        self.assertDictEqual(
            jwt_token.payload["course"],
            {"school_name": "ufr", "course_name": "mathematics", "course_run": None},
        )
        self.assertEqual(context.get("modelName"), "videos")

        # Make sure we only go through LTI verification once as it is costly (getting passport +
        # signature)
        self.assertEqual(mock_verify.call_count, 1)

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    def test_views_lti_video_post_student_no_video(
        self, mock_get_consumer_site, mock_verify
    ):
        """Validate the response returned for a student request when there is no video."""
        passport = ConsumerSiteLTIPassportFactory()
        data = {
            "resource_link_id": "example.com-123",
            "context_id": "course-v1:ufr+mathematics+00001",
            "roles": "student",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
        }
        mock_get_consumer_site.return_value = passport.consumer_site

        response = self.client.post("/lti/videos/{!s}".format(uuid.uuid4()), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")

        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        self.assertEqual(context.get("state"), "success")
        self.assertIsNone(context.get("resource"))
        self.assertEqual(context.get("modelName"), "videos")

        # Make sure we only go through LTI verification once as it is costly (getting passport +
        # signature)
        self.assertEqual(mock_verify.call_count, 1)

    @mock.patch.object(Logger, "warning")
    @mock.patch.object(LTI, "verify", side_effect=LTIException("lti error"))
    def test_views_lti_video_post_error(self, mock_verify, mock_logger):
        """Validate the response returned in case of an LTI exception."""
        role = random.choice(["instructor", "student"])
        data = {"resource_link_id": "123", "roles": role, "context_id": "abc"}
        response = self.client.post("/lti/videos/{!s}".format(uuid.uuid4()), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")

        mock_logger.assert_called_once_with("lti error")

        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        self.assertEqual(context.get("state"), "error")
        self.assertIsNone(context.get("resource"))
        self.assertEqual(context.get("modelName"), "videos")

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    def test_views_lti_video_with_timed_text(self, mock_get_consumer_site, mock_verify):
        """Make sure the LTI Video view functions when the Video has associated TimedTextTracks.

        NB: This is a bug-reproducing test case.
        The comprehensive test suite in test_api_video does not cover this case as it uses a JWT
        and therefore falls in another case when it comes to handling of video ids.
        """
        passport = ConsumerSiteLTIPassportFactory()
        video = VideoFactory(playlist__consumer_site=passport.consumer_site)
        # Create a TimedTextTrack associated with the video to trigger the error
        TimedTextTrackFactory(video=video)

        data = {
            "resource_link_id": video.lti_id,
            "context_id": video.playlist.lti_id,
            "roles": "instructor",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
        }
        mock_get_consumer_site.return_value = passport.consumer_site

        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        content = response.content.decode("utf-8")
        match = re.search(
            '<div id="marsha-frontend-data" data-context="(.*)">', content
        )

        context = json.loads(unescape(match.group(1)))
        jwt_token = AccessToken(context.get("jwt"))
        self.assertEqual(jwt_token.payload["resource_id"], str(video.id))
        self.assertEqual(jwt_token.payload["context_id"], data["context_id"])
        self.assertEqual(jwt_token.payload["roles"], [data["roles"]])
        self.assertEqual(jwt_token.payload["locale"], "en_US")
        self.assertEqual(
            jwt_token.payload["permissions"],
            {"can_access_dashboard": True, "can_update": True},
        )
        self.assertEqual(context.get("modelName"), "videos")

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    @mock.patch.object(staticfiles_storage, "url")
    def test_views_lti_video_static_base_url_with_trailing_slash(
        self, mock_staticfiles_storage_url, mock_get_consumer_site, mock_verify
    ):
        """Trailing slash is kept on static base url when present."""
        passport = ConsumerSiteLTIPassportFactory()
        video = VideoFactory(playlist__consumer_site=passport.consumer_site)
        data = {
            "resource_link_id": video.lti_id,
            "context_id": video.playlist.lti_id,
            "roles": "instructor",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
            "launch_presentation_locale": "fr",
        }
        mock_get_consumer_site.return_value = passport.consumer_site
        mock_staticfiles_storage_url.return_value = "/static/"

        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        self.assertContains(response, '<meta name="public-path" value="/static/" />')

    @mock.patch.object(LTI, "verify")
    @mock.patch.object(LTI, "get_consumer_site")
    @mock.patch.object(staticfiles_storage, "url")
    def test_views_lti_video_static_base_url_without_trailing_slash(
        self, mock_staticfiles_storage_url, mock_get_consumer_site, mock_verify
    ):
        """Trailing slash is added on static base url when missing."""
        passport = ConsumerSiteLTIPassportFactory()
        video = VideoFactory(playlist__consumer_site=passport.consumer_site)
        data = {
            "resource_link_id": video.lti_id,
            "context_id": video.playlist.lti_id,
            "roles": "instructor",
            "oauth_consumer_key": passport.oauth_consumer_key,
            "user_id": "56255f3807599c377bf0e5bf072359fd",
            "launch_presentation_locale": "fr",
        }
        mock_get_consumer_site.return_value = passport.consumer_site
        mock_staticfiles_storage_url.return_value = "/static"

        response = self.client.post("/lti/videos/{!s}".format(video.pk), data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<html>")
        self.assertContains(response, '<meta name="public-path" value="/static/" />')
