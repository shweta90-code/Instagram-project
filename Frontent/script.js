const API = "http://localhost:3000/api";

let currentUser = JSON.parse(localStorage.getItem("instagramUser")) || null;
let selectedChatUser = null;
let allUsers = [];
let currentPosts = [];

// =========================
// BASIC HELPERS
// =========================

const $ = (id) => document.getElementById(id);

function show(id) {
  const el = $(id);
  if (el) el.style.display = "";
}

function hide(id) {
  const el = $(id);
  if (el) el.style.display = "none";
}

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function imageOrDefault(url) {
  return url && String(url).trim()
    ? url
    : "https://via.placeholder.com/150?text=User";
}

function saveCurrentUser(user) {
  currentUser = user;
  localStorage.setItem("instagramUser", JSON.stringify(user));
}

function getUserId(user = currentUser) {
  if (!user) return null;
  return user.id || user._id;
}

async function api(endpoint, options = {}) {
  try {
    const response = await fetch(`${API}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed (${response.status})`
      );
    }

    return data;
  } catch (error) {
    console.error("API Error:", endpoint, error);
    throw error;
  }
}

function toast(message) {
  const toastBox = $("toast");
  const toastMessage = $("toastMessage");

  if (!toastBox || !toastMessage) return;

  toastMessage.textContent = message;
  toastBox.style.display = "block";

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toastBox.style.display = "none";
  }, 2500);
}

// =========================
// AUTH
// =========================

function showLogin() {
  show("loginBox");
  hide("registerBox");

  if ($("loginMessage")) $("loginMessage").textContent = "";
  if ($("registerMessage")) $("registerMessage").textContent = "";
}

function showRegister() {
  hide("loginBox");
  show("registerBox");

  if ($("loginMessage")) $("loginMessage").textContent = "";
  if ($("registerMessage")) $("registerMessage").textContent = "";
}

async function login() {
  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;

  const message = $("loginMessage");

  if (!email || !password) {
    if (message) message.textContent = "Email and password are required.";
    return;
  }

  try {
    if (message) message.textContent = "Logging in...";

    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    saveCurrentUser(data.user);

    if (message) message.textContent = "";

    showApp();
    toast("Login successful");
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

async function register() {
  const name = $("registerName")?.value.trim();
  const username = $("registerUsername")?.value.trim();
  const email = $("registerEmail")?.value.trim();
  const password = $("registerPassword")?.value;
  const phone = $("registerPhone")?.value.trim();

  const message = $("registerMessage");

  if (!username || !email || !password) {
    if (message) {
      message.textContent = "Username, email and password are required.";
    }
    return;
  }

  try {
    if (message) message.textContent = "Creating account...";

    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    if (message) {
      message.textContent =
        data.message || "Registration successful. Please login.";
    }

    if ($("registerName")) $("registerName").value = "";
    if ($("registerUsername")) $("registerUsername").value = "";
    if ($("registerEmail")) $("registerEmail").value = "";
    if ($("registerPassword")) $("registerPassword").value = "";
    if ($("registerPhone")) $("registerPhone").value = "";

    setTimeout(() => {
      showLogin();

      if ($("loginEmail")) {
        $("loginEmail").value = email;
      }
    }, 800);
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

function logout() {
  localStorage.removeItem("instagramUser");
  currentUser = null;
  selectedChatUser = null;

  hide("appSection");
  show("authSection");
  showLogin();

  toast("Logged out");
}

function showApp() {
  hide("authSection");
  show("appSection");

  loadHome();
  loadSuggestions();
  loadNotifications();
}

// =========================
// NAVIGATION
// =========================

function showPage(pageName) {
  const pages = [
    "homePage",
    "searchPage",
    "explorePage",
    "reelsPage",
    "messagesPage",
    "notificationsPage",
    "createPage",
    "profilePage",
    "savedPage"
  ];

  pages.forEach((page) => {
    if ($(page)) {
      $(page).style.display = "none";
    }
  });

  const pageMap = {
    home: "homePage",
    search: "searchPage",
    explore: "explorePage",
    reels: "reelsPage",
    messages: "messagesPage",
    notifications: "notificationsPage",
    create: "createPage",
    profile: "profilePage",
    saved: "savedPage"
  };

  const target = pageMap[pageName];

  if (!target || !$(target)) return;

  $(target).style.display = "block";

  if (pageName === "home") {
    loadHome();
  }

  if (pageName === "search") {
    loadUsers();
  }

  if (pageName === "explore") {
    loadExplore();
  }

  if (pageName === "messages") {
    loadUsers();
  }

  if (pageName === "notifications") {
    loadNotifications();
  }

  if (pageName === "create") {
    if ($("createPostMessage")) {
      $("createPostMessage").textContent = "";
    }
  }

  if (pageName === "profile") {
    loadProfile();
  }

  if (pageName === "saved") {
    loadSavedPosts();
  }
}

// =========================
// HOME
// =========================

async function loadHome() {
  updateHomeProfile();
  await loadStories();
  await loadPosts();
}

function updateHomeProfile() {
  if (!currentUser) return;

  const username = currentUser.username || "User";
  const name = currentUser.name || username;

  if ($("homeUsername")) {
    $("homeUsername").textContent = username;
  }

  if ($("homeUserName")) {
    $("homeUserName").textContent = name;
  }

  if ($("homeProfileImage")) {
    $("homeProfileImage").src = imageOrDefault(
      currentUser.profilePicture || currentUser.profilePic
    );
  }
}

async function loadPosts() {
  const container = $("postsContainer");

  if (!container) return;

  container.innerHTML = `<p class="loading">Loading posts...</p>`;

  try {
    const data = await api("/posts");

    currentPosts = Array.isArray(data)
      ? data
      : data.posts || data.data || [];

    if (!currentPosts.length) {
      container.innerHTML = `
        <div class="empty">
          <h3>No posts yet</h3>
          <p>Create the first post.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = currentPosts
      .map((post) => createPostHTML(post))
      .join("");
  } catch (error) {
    container.innerHTML = `
      <div class="empty">
        <h3>Could not load posts</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

function createPostHTML(post) {
  const postId = post._id || post.id;

  const postUser =
    typeof post.user === "object" && post.user
      ? post.user
      : {};

  const username =
    postUser.username ||
    post.username ||
    "User";

  const profilePicture =
    postUser.profilePicture ||
    postUser.profilePic ||
    post.profilePicture;

  const likes = Array.isArray(post.likes)
    ? post.likes
    : [];

  const currentUserId = getUserId();

  const liked = likes.some(
    (id) =>
      String(typeof id === "object" ? id._id : id) ===
      String(currentUserId)
  );

  const isOwner =
    String(
      typeof post.user === "object"
        ? post.user._id
        : post.user
    ) === String(currentUserId);

  const comments = Array.isArray(post.comments)
    ? post.comments
    : [];

  return `
    <article class="post-card" data-post-id="${escapeHTML(postId)}">

      <div class="post-header">
        <div class="post-user"
             onclick="openUserProfile('${escapeHTML(
               typeof post.user === "object"
                 ? post.user._id
                 : post.user
             )}')">

          <img
            src="${imageOrDefault(profilePicture)}"
            alt="${escapeHTML(username)}"
          >

          <strong>${escapeHTML(username)}</strong>
        </div>

        ${
          isOwner
            ? `
              <button
                class="post-delete-btn"
                onclick="deletePost('${escapeHTML(postId)}')">
                <span class="material-symbols-outlined">more_horiz</span>
              </button>
            `
            : ""
        }
      </div>

      <img
        class="post-image"
        src="${escapeHTML(post.image)}"
        alt="Post"
        onclick="openPost('${escapeHTML(postId)}')"
      >

      <div class="post-actions">

        <button onclick="toggleLike('${escapeHTML(postId)}')">
          <span class="material-symbols-outlined ${
            liked ? "liked-icon" : ""
          }">
            ${liked ? "favorite" : "favorite_border"}
          </span>
        </button>

        <button onclick="openPost('${escapeHTML(postId)}')">
          <span class="material-symbols-outlined">
            mode_comment
          </span>
        </button>

        <button onclick="openPost('${escapeHTML(postId)}')">
          <span class="material-symbols-outlined">
            send
          </span>
        </button>

        <button
          class="save-action"
          onclick="toggleSave('${escapeHTML(postId)}')">
          <span class="material-symbols-outlined">
            bookmark_border
          </span>
        </button>

      </div>

      <div class="post-info">

        <strong>
          ${likes.length} ${likes.length === 1 ? "like" : "likes"}
        </strong>

        ${
          post.caption
            ? `
              <p>
                <strong>${escapeHTML(username)}</strong>
                ${escapeHTML(post.caption)}
              </p>
            `
            : ""
        }

        ${
          comments.length
            ? `
              <button
                class="view-comments"
                onclick="openPost('${escapeHTML(postId)}')">
                View all ${comments.length} comments
              </button>
            `
            : ""
        }

      </div>

    </article>
  `;
}

// =========================
// CREATE POST
// =========================

async function createPost(event) {
  event.preventDefault();

  if (!currentUser) {
    toast("Please login first");
    return;
  }

  const image = $("postImage")?.value.trim();
  const caption = $("postCaption")?.value.trim();

  const message = $("createPostMessage");
  const button = $("createPostBtn");

  if (!image) {
    if (message) message.textContent = "Image URL is required.";
    return;
  }

  try {
    if (button) button.disabled = true;
    if (message) message.textContent = "Creating post...";

    await api("/posts", {
      method: "POST",
      body: JSON.stringify({
        user: getUserId(),
        image,
        caption
      })
    });

    if ($("postImage")) $("postImage").value = "";
    if ($("postCaption")) $("postCaption").value = "";

    if (message) message.textContent = "";

    toast("Post created successfully");

    showPage("home");
  } catch (error) {
    if (message) message.textContent = error.message;
  } finally {
    if (button) button.disabled = false;
  }
}

// =========================
// DELETE POST
// =========================

async function deletePost(postId) {
  if (!postId) return;

  const confirmed = confirm("Delete this post?");

  if (!confirmed) return;

  try {
    await api(`/posts/${postId}`, {
      method: "DELETE"
    });

    toast("Post deleted");

    await loadPosts();
    await loadProfile();
  } catch (error) {
    toast(error.message);
  }
}

// =========================
// LIKE
// =========================

async function toggleLike(postId) {
  if (!currentUser) {
    toast("Please login first");
    return;
  }

  try {
    await api(`/likes/${postId}`, {
      method: "POST",
      body: JSON.stringify({
        userId: getUserId()
      })
    });

    await loadPosts();
  } catch (error) {
    toast(error.message);
  }
}

// =========================
// POST MODAL
// =========================

async function openPost(postId) {
  const modal = $("postModal");
  const content = $("modalPostContent");

  if (!modal || !content) return;

  modal.style.display = "flex";

  content.innerHTML = `
    <p class="loading">Loading post...</p>
  `;

  try {
    const data = await api(`/posts/${postId}`);

    const post = data.post || data.data || data;

    const postUser =
      typeof post.user === "object" && post.user
        ? post.user
        : {};

    const username =
      postUser.username ||
      post.username ||
      "User";

    const comments = Array.isArray(post.comments)
      ? post.comments
      : [];

    const likes = Array.isArray(post.likes)
      ? post.likes
      : [];

    content.innerHTML = `
      <div class="modal-post">

        <img
          class="modal-post-image"
          src="${escapeHTML(post.image)}"
          alt="Post"
        >

        <div class="modal-post-info">

          <div class="post-header">
            <div class="post-user">
              <img
                src="${imageOrDefault(
                  postUser.profilePicture ||
                  postUser.profilePic
                )}"
                alt="${escapeHTML(username)}"
              >
              <strong>${escapeHTML(username)}</strong>
            </div>
          </div>

          ${
            post.caption
              ? `
                <p class="modal-caption">
                  <strong>${escapeHTML(username)}</strong>
                  ${escapeHTML(post.caption)}
                </p>
              `
              : ""
          }

          <p>
            <strong>${likes.length}</strong>
            ${likes.length === 1 ? "like" : "likes"}
          </p>

          <div class="modal-comments">

            <h3>Comments</h3>

            ${
              comments.length
                ? comments
                    .map((comment) => {
                      const commentUser =
                        typeof comment.user === "object"
                          ? comment.user
                          : {};

                      return `
                        <div class="comment-item">
                          <strong>
                            ${escapeHTML(
                              commentUser.username ||
                              "User"
                            )}
                          </strong>
                          <span>
                            ${escapeHTML(comment.text)}
                          </span>
                        </div>
                      `;
                    })
                    .join("")
                : `<p>No comments yet.</p>`
            }

          </div>

          <div class="comment-form">
            <input
              type="text"
              id="modalCommentInput"
              placeholder="Add a comment..."
            >

            <button
              onclick="addComment('${escapeHTML(postId)}')">
              Post
            </button>
          </div>

        </div>

      </div>
    `;
  } catch (error) {
    content.innerHTML = `
      <div class="empty">
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

function closePostModal() {
  if ($("postModal")) {
    $("postModal").style.display = "none";
  }
}

// =========================
// COMMENTS
// =========================

async function addComment(postId) {
  if (!currentUser) {
    toast("Please login first");
    return;
  }

  const input = $("modalCommentInput");
  const text = input?.value.trim();

  if (!text) {
    toast("Write a comment first");
    return;
  }

  try {
    await api("/comments", {
      method: "POST",
      body: JSON.stringify({
        postId,
        userId: getUserId(),
        text
      })
    });

    toast("Comment added");

    await openPost(postId);
    await loadPosts();
  } catch (error) {
    toast(error.message);
  }
}

// =========================
// SAVE / UNSAVE
// =========================

async function toggleSave(postId) {
  if (!currentUser) {
    toast("Please login first");
    return;
  }

  try {
    const savedData = await api(`/saves/${getUserId()}`);

    const savedPosts = Array.isArray(savedData)
      ? savedData
      : savedData.savedPosts || savedData.data || [];

    const alreadySaved = savedPosts.some((item) => {
      const savedPostId =
        item.postId?._id ||
        item.postId ||
        item.post?._id;

      return String(savedPostId) === String(postId);
    });

    if (alreadySaved) {
      await api("/saves/unsave", {
        method: "DELETE",
        body: JSON.stringify({
          userId: getUserId(),
          postId
        })
      });

      toast("Post removed from saved");
    } else {
      await api("/saves/save", {
        method: "POST",
        body: JSON.stringify({
          userId: getUserId(),
          postId
        })
      });

      toast("Post saved");
    }

    await loadSavedPosts();
  } catch (error) {
    toast(error.message);
  }
}

async function loadSavedPosts() {
  const container = $("savedPosts");

  if (!container || !currentUser) return;

  container.innerHTML = `<p class="loading">Loading saved posts...</p>`;

  try {
    const data = await api(`/saves/${getUserId()}`);

    const savedPosts = Array.isArray(data)
      ? data
      : data.savedPosts || data.data || [];

    if (!savedPosts.length) {
      container.innerHTML = `
        <div class="empty">
          <h3>No saved posts</h3>
          <p>Posts you save will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = savedPosts
      .map((item) => {
        const post = item.postId || item.post;

        if (!post) return "";

        return `
          <div
            class="saved-post-item"
            onclick="openPost('${escapeHTML(
              post._id || post.id
            )}')"
          >
            <img
              src="${escapeHTML(post.image)}"
              alt="Saved post"
            >
          </div>
        `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = `
      <div class="empty">
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

// =========================
// STORIES
// =========================

async function loadStories() {
  const container = $("storiesList");

  if (!container) return;

  try {
    const data = await api("/stories");

    const stories = Array.isArray(data)
      ? data
      : data.stories || data.data || [];

    if (!stories.length) {
      container.innerHTML = `
        <div class="story-empty">
          No stories
        </div>
      `;
      return;
    }

    container.innerHTML = stories
      .map((story) => {
        const user =
          typeof story.user === "object"
            ? story.user
            : {};

        return `
          <div
            class="story-item"
            onclick="viewStory('${escapeHTML(
              story._id || story.id
            )}')"
          >
            <img
              src="${imageOrDefault(
                user.profilePicture ||
                user.profilePic
              )}"
              alt="${escapeHTML(user.username || "User")}"
            >

            <span>
              ${escapeHTML(user.username || "User")}
            </span>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Stories error:", error);
  }
}

async function createStory() {
  if (!currentUser) return;

  const image = prompt("Enter story image URL:");

  if (!image) return;

  const caption = prompt("Enter story caption:");

  try {
    await api("/stories", {
      method: "POST",
      body: JSON.stringify({
        user: getUserId(),
        image,
        caption: caption || ""
      })
    });

    toast("Story created");
    loadStories();
  } catch (error) {
    toast(error.message);
  }
}
function openStoryPicker() {
  if (!currentUser) {
    toast("Please login first");
    return;
  }

  const input = $("storyFileInput");

  if (input) {
    input.click();
  }
}

async function uploadStoryImage(event) {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const formData = new FormData();

    formData.append("image", file);
    formData.append("user", getUserId());

    const caption = prompt("Enter story caption:");

    formData.append("caption", caption || "");

    const response = await fetch(
      `${API}/stories`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Story upload failed"
      );
    }

    toast("Story uploaded ❤️");

    event.target.value = "";

    await loadStories();

  } catch (error) {
    console.error("Story upload error:", error);
    toast(error.message);
  }
}
async function viewStory(storyId) {
  if (!currentUser) {
    toast("Please login first");
    return;
  }

  try {
    // Get story details
    const story = await api(`/stories/${storyId}`);

    // Mark story as viewed
    await api(`/stories/${storyId}/view`, {
      method: "PUT",
      body: JSON.stringify({
        userId: getUserId()
      })
    });

    const viewer = $("storyViewer");
    const image = $("storyViewerImage");
    const username = $("storyViewerUsername");
    const caption = $("storyViewerCaption");

    if (!viewer || !image) return;

    const user =
      typeof story.user === "object"
        ? story.user
        : {};

    image.src = imageOrDefault(story.image);

    username.textContent =
      user.username || "User";

    caption.textContent =
      story.caption || "";

    viewer.classList.add("active");

  } catch (error) {
    console.error(
      "View story error:",
      error
    );

    toast(error.message);
  }
}
function closeStoryViewer() {
  const viewer = $("storyViewer");

  if (viewer) {
    viewer.classList.remove("active");
  }
}
// =========================
// USERS / SUGGESTIONS
// =========================

async function loadUsers() {
  try {
    const data = await api("/users");

    allUsers = Array.isArray(data)
      ? data
      : data.users || data.data || [];

    renderSearchResults(allUsers);
    renderConversationList(allUsers);
  } catch (error) {
    console.error("Users error:", error);
  }
}

async function loadSuggestions() {
  const container = $("suggestionsList");

  if (!container || !currentUser) return;

  try {
    const data = await api("/users");

    allUsers = Array.isArray(data)
      ? data
      : data.users || data.data || [];

    const myId = getUserId();

    const suggestions = allUsers
      .filter(
        (user) =>
          String(user._id || user.id) !== String(myId)
      )
      .slice(0, 5);

    if (!suggestions.length) {
      container.innerHTML = `<p>No suggestions available.</p>`;
      return;
    }

    container.innerHTML = suggestions
      .map((user) => createSuggestionHTML(user))
      .join("");
  } catch (error) {
    container.innerHTML = `
      <p>${escapeHTML(error.message)}</p>
    `;
  }
}

function createSuggestionHTML(user) {
  const userId = user._id || user.id;

  const following = Array.isArray(currentUser?.following)
    ? currentUser.following
    : [];

  const isFollowing = following.some(
    (id) =>
      String(typeof id === "object" ? id._id : id) ===
      String(userId)
  );

  return `
    <div class="suggestion-item">

      <div
        class="suggestion-user"
        onclick="openUserProfile('${escapeHTML(userId)}')"
      >
        <img
          src="${imageOrDefault(
            user.profilePicture ||
            user.profilePic
          )}"
          alt="${escapeHTML(user.username)}"
        >

        <div>
          <strong>${escapeHTML(user.username)}</strong>
          <span>${escapeHTML(user.name || "")}</span>
        </div>
      </div>

      <button
        class="follow-btn"
        onclick="toggleFollow('${escapeHTML(userId)}')"
      >
        ${isFollowing ? "Following" : "Follow"}
      </button>

    </div>
  `;
}

async function toggleFollow(userId) {
  if (!currentUser) return;

  try {
    const data = await api(`/follow/${userId}`, {
      method: "POST",
      body: JSON.stringify({
        followerId: getUserId()
      })
    });

    const isFollowing = data.following;

    if (!Array.isArray(currentUser.following)) {
      currentUser.following = [];
    }

    if (isFollowing) {
      if (
        !currentUser.following.some(
          (id) =>
            String(typeof id === "object" ? id._id : id) ===
            String(userId)
        )
      ) {
        currentUser.following.push(userId);
      }
    } else {
      currentUser.following =
        currentUser.following.filter(
          (id) =>
            String(typeof id === "object" ? id._id : id) !==
            String(userId)
        );
    }

    saveCurrentUser(currentUser);

    toast(data.message || "Follow updated");

    loadSuggestions();
  } catch (error) {
    toast(error.message);
  }
}

// =========================
// SEARCH
// =========================

function renderSearchResults(users) {
  const container = $("searchResults");

  if (!container) return;

  if (!users.length) {
    container.innerHTML = `<p>No users found.</p>`;
    return;
  }

  container.innerHTML = users
    .filter(
      (user) =>
        String(user._id || user.id) !==
        String(getUserId())
    )
    .map(
      (user) => `
        <div
          class="search-user"
          onclick="openUserProfile('${escapeHTML(
            user._id || user.id
          )}')"
        >

          <img
            src="${imageOrDefault(
              user.profilePicture ||
              user.profilePic
            )}"
            alt="${escapeHTML(user.username)}"
          >

          <div>
            <strong>${escapeHTML(user.username)}</strong>
            <span>${escapeHTML(user.name || "")}</span>
          </div>

        </div>
      `
    )
    .join("");
}

function searchUsers() {
  const input = $("searchInput");

  if (!input) return;

  const searchText = input.value
    .toLowerCase()
    .trim();

  if (!searchText) {
    renderSearchResults(allUsers);
    return;
  }

  const filtered = allUsers.filter((user) => {
    const username =
      String(user.username || "").toLowerCase();

    const name =
      String(user.name || "").toLowerCase();

    return (
      username.includes(searchText) ||
      name.includes(searchText)
    );
  });

  renderSearchResults(filtered);
}

// =========================
// EXPLORE
// =========================

async function loadExplore() {
  const container = $("explorePosts");

  if (!container) return;

  container.innerHTML = `<p class="loading">Loading...</p>`;

  try {
    const data = await api("/posts");

    const posts = Array.isArray(data)
      ? data
      : data.posts || data.data || [];

    if (!posts.length) {
      container.innerHTML = `<p>No posts available.</p>`;
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
          <div
            class="explore-item"
            onclick="openPost('${escapeHTML(
              post._id || post.id
            )}')"
          >
            <img
              src="${escapeHTML(post.image)}"
              alt="Post"
            >
          </div>
        `
      )
      .join("");
  } catch (error) {
    container.innerHTML = `
      <p>${escapeHTML(error.message)}</p>
    `;
  }
}

// =========================
// PROFILE
// =========================

async function loadProfile() {
  if (!currentUser) return;

  try {
    const data = await api(
      `/auth/user/${getUserId()}`
    );

    const user = data.user || data;

    saveCurrentUser({
      ...currentUser,
      ...user,
      id: user._id || user.id || currentUser.id
    });

    renderProfile(user);
    await loadProfilePosts();
  } catch (error) {
    console.error("Profile error:", error);

    renderProfile(currentUser);
    await loadProfilePosts();
  }
}

function renderProfile(user) {
  const profilePicture =
    user.profilePicture ||
    user.profilePic;

  if ($("profileImage")) {
    $("profileImage").src =
      imageOrDefault(profilePicture);
  }

  if ($("profileUsername")) {
    $("profileUsername").textContent =
      user.username || "username";
  }

  if ($("profileName")) {
    $("profileName").textContent =
      user.name || "";
  }

  if ($("profileBio")) {
    $("profileBio").textContent =
      user.bio || "";
  }

  if ($("followersCount")) {
    $("followersCount").textContent =
      Array.isArray(user.followers)
        ? user.followers.length
        : 0;
  }

  if ($("followingCount")) {
    $("followingCount").textContent =
      Array.isArray(user.following)
        ? user.following.length
        : 0;
  }
}

async function loadProfilePosts() {
  const container = $("profilePosts");

  if (!container || !currentUser) return;

  try {
    const data = await api(
      `/posts/user/${getUserId()}`
    );

    const posts = Array.isArray(data)
      ? data
      : data.posts || data.data || [];

    if ($("postCount")) {
      $("postCount").textContent = posts.length;
    }

    if (!posts.length) {
      container.innerHTML = `
        <div class="empty">
          <h3>No posts yet</h3>
        </div>
      `;
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
          <div
            class="profile-post-item"
            onclick="openPost('${escapeHTML(
              post._id || post.id
            )}')"
          >
            <img
              src="${escapeHTML(post.image)}"
              alt="Post"
            >
          </div>
        `
      )
      .join("");
  } catch (error) {
    container.innerHTML = `
      <div class="empty">
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

// =========================
// EDIT PROFILE
// =========================

function openEditProfile() {
  if (!currentUser) return;

  show("editProfileBox");

  if ($("editName")) {
    $("editName").value =
      currentUser.name || "";
  }

  if ($("editUsername")) {
    $("editUsername").value =
      currentUser.username || "";
  }

  if ($("editBio")) {
    $("editBio").value =
      currentUser.bio || "";
  }

  if ($("editProfilePic")) {
    $("editProfilePic").value =
      currentUser.profilePic ||
      currentUser.profilePicture ||
      "";
  }

  if ($("editPhone")) {
    $("editPhone").value =
      currentUser.phone || "";
  }
}

function cancelEditProfile() {
  hide("editProfileBox");

  if ($("profileMessage")) {
    $("profileMessage").textContent = "";
  }
}

async function saveProfile() {
  if (!currentUser) return;

  const message = $("profileMessage");

  const name =
    $("editName")?.value.trim() || "";

  const username =
    $("editUsername")?.value.trim() || "";

  const bio =
    $("editBio")?.value.trim() || "";

  const profilePic =
    $("editProfilePic")?.value.trim() || "";

  const phone =
    $("editPhone")?.value.trim() || "";

  try {
    if (message) {
      message.textContent = "Saving...";
    }

    const data = await api(
      `/users/${getUserId()}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name,
          username,
          bio,
          profilePic,
          phone
        })
      }
    );

    const updatedUser =
      data.user || data;

    saveCurrentUser({
      ...currentUser,
      ...updatedUser,
      id:
        updatedUser._id ||
        updatedUser.id ||
        currentUser.id
    });

    renderProfile(currentUser);
    updateHomeProfile();

    hide("editProfileBox");

    if (message) {
      message.textContent = "";
    }

    toast("Profile updated successfully");
  } catch (error) {
    if (message) {
      message.textContent = error.message;
    }
  }
}

// =========================
// USER PROFILE MODAL
// =========================

async function openUserProfile(userId) {
  const modal = $("userModal");
  const content = $("userModalContent");

  if (!modal || !content) return;

  modal.style.display = "flex";

  content.innerHTML =
    `<p class="loading">Loading profile...</p>`;

  try {
    const data = await api(
      `/users/${userId}`
    );

    const user = data.user || data;

    const followers = Array.isArray(user.followers)
      ? user.followers.length
      : 0;

    const following = Array.isArray(user.following)
      ? user.following.length
      : 0;

    const postsData = await api(
      `/posts/user/${userId}`
    );

    const posts = Array.isArray(postsData)
      ? postsData
      : postsData.posts ||
        postsData.data ||
        [];

    const followingMe = Array.isArray(currentUser?.following)
      ? currentUser.following.some(
          (id) =>
            String(
              typeof id === "object"
                ? id._id
                : id
            ) === String(userId)
        )
      : false;

    content.innerHTML = `
      <div class="user-profile-modal">

        <div class="user-profile-top">

          <img
            src="${imageOrDefault(
              user.profilePicture ||
              user.profilePic
            )}"
            alt="${escapeHTML(user.username)}"
          >

          <div>
            <h2>${escapeHTML(
              user.username || "User"
            )}</h2>

            <p>${escapeHTML(
              user.name || ""
            )}</p>
          </div>

        </div>

        <p class="user-bio">
          ${escapeHTML(user.bio || "")}
        </p>

        <div class="profile-stats">
          <span>
            <strong>${posts.length}</strong>
            posts
          </span>

          <span>
            <strong>${followers}</strong>
            followers
          </span>

          <span>
            <strong>${following}</strong>
            following
          </span>
        </div>

        ${
          String(userId) !== String(getUserId())
            ? `
              <button
                class="follow-main-btn"
                onclick="toggleFollowFromModal('${escapeHTML(
                  userId
                )}')"
              >
                ${
                  followingMe
                    ? "Following"
                    : "Follow"
                }
              </button>
            `
            : ""
        }

        <div class="user-post-grid">

          ${
            posts.length
              ? posts
                  .map(
                    (post) => `
                      <div
                        class="user-post-item"
                        onclick="openPost('${escapeHTML(
                          post._id ||
                          post.id
                        )}')"
                      >
                        <img
                          src="${escapeHTML(
                            post.image
                          )}"
                          alt="Post"
                        >
                      </div>
                    `
                  )
                  .join("")
              : `<p>No posts yet.</p>`
          }

        </div>

      </div>
    `;
  } catch (error) {
    content.innerHTML = `
      <div class="empty">
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

async function toggleFollowFromModal(userId) {
  await toggleFollow(userId);
  await openUserProfile(userId);
}

function closeUserModal() {
  if ($("userModal")) {
    $("userModal").style.display = "none";
  }
}

// =========================
// MESSAGES
// =========================

function renderConversationList(users) {
  const container = $("conversationList");

  if (!container) return;

  const otherUsers = users.filter(
    (user) =>
      String(user._id || user.id) !==
      String(getUserId())
  );

  if (!otherUsers.length) {
    container.innerHTML =
      `<p class="empty">No users available.</p>`;
    return;
  }

  container.innerHTML = otherUsers
    .map(
      (user) => `
        <div
          class="conversation-item"
          onclick='openChat(${JSON.stringify({
            id: user._id || user.id,
            username: user.username,
            profilePicture:
              user.profilePicture ||
              user.profilePic
          })})'
        >

          <img
            src="${imageOrDefault(
              user.profilePicture ||
              user.profilePic
            )}"
            alt="${escapeHTML(user.username)}"
          >

          <div>
            <strong>${escapeHTML(
              user.username
            )}</strong>
            <span>Start a conversation</span>
          </div>

        </div>
      `
    )
    .join("");
}

function filterConversations() {
  const input = $("messageSearch");

  if (!input) return;

  const text = input.value
    .toLowerCase()
    .trim();

  const filtered = allUsers.filter((user) => {
    if (
      String(user._id || user.id) ===
      String(getUserId())
    ) {
      return false;
    }

    return String(
      user.username || ""
    )
      .toLowerCase()
      .includes(text);
  });

  renderConversationList(filtered);
}

async function openChat(user) {
  selectedChatUser = user;

  hide("chatEmpty");
  show("chatBox");

  const header = $("chatHeader");

  if (header) {
    header.innerHTML = `
      <img
        src="${imageOrDefault(
          user.profilePicture
        )}"
        alt="${escapeHTML(user.username)}"
      >

      <strong>
        ${escapeHTML(user.username)}
      </strong>
    `;
  }

  await loadChatMessages();
}

async function loadChatMessages() {
  if (!selectedChatUser || !currentUser) return;

  const container = $("messagesContainer");

  if (!container) return;

  container.innerHTML =
    `<p class="loading">Loading messages...</p>`;

  try {
    const data = await api(
      `/messages/${getUserId()}/${selectedChatUser.id}`
    );

    const messages = Array.isArray(data)
      ? data
      : data.messages ||
        data.data ||
        [];

    if (!messages.length) {
      container.innerHTML =
        `<p class="empty">No messages yet.</p>`;
      return;
    }

    container.innerHTML = messages
      .map((msg) => {
        const senderId =
          typeof msg.sender === "object"
            ? msg.sender._id
            : msg.sender;

        const mine =
          String(senderId) ===
          String(getUserId());

        return `
          <div
            class="message ${
              mine
                ? "my-message"
                : "other-message"
            }"
          >
            ${escapeHTML(
              msg.message || ""
            )}
          </div>
        `;
      })
      .join("");

    container.scrollTop =
      container.scrollHeight;

    await markMessagesRead();
  } catch (error) {
    container.innerHTML = `
      <p class="empty">
        ${escapeHTML(error.message)}
      </p>
    `;
  }
}

async function sendMessage() {
  if (!currentUser || !selectedChatUser) {
    toast("Select a user first");
    return;
  }

  const input = $("messageInput");

  if (!input) return;

  const message = input.value.trim();

  if (!message) return;

  try {
    await api("/messages", {
      method: "POST",
      body: JSON.stringify({
        sender: getUserId(),
        receiver: selectedChatUser.id,
        message
      })
    });

    input.value = "";

    await loadChatMessages();
  } catch (error) {
    toast(error.message);
  }
}

async function markMessagesRead() {
  if (!currentUser || !selectedChatUser) return;

  try {
    await api(
      `/messages/read/${selectedChatUser.id}/${getUserId()}`,
      {
        method: "PUT"
      }
    );
  } catch (error) {
    console.error(
      "Mark read error:",
      error
    );
  }
}

// =========================
// NOTIFICATIONS
// =========================

async function loadNotifications() {
  const container = $("notificationsList");

  if (!container || !currentUser) return;

  container.innerHTML =
    `<p class="loading">Loading notifications...</p>`;

  try {
    const data = await api(
      `/notifications/${getUserId()}`
    );

    const notifications = Array.isArray(data)
      ? data
      : data.notifications ||
        data.data ||
        [];

    if (!notifications.length) {
      container.innerHTML = `
        <div class="empty">
          <h3>No notifications</h3>
        </div>
      `;
      return;
    }

    container.innerHTML = notifications
      .map((notification) => {
        const sender =
          typeof notification.sender === "object"
            ? notification.sender
            : {};

        return `
          <div
            class="notification-item ${
              notification.isRead
                ? "read"
                : "unread"
            }"
            onclick="markNotificationRead('${escapeHTML(
              notification._id ||
              notification.id
            )}')"
          >

            <img
              src="${imageOrDefault(
                sender.profilePicture ||
                sender.profilePic
              )}"
              alt="${escapeHTML(
                sender.username ||
                "User"
              )}"
            >

            <div>
              <strong>
                ${escapeHTML(
                  sender.username ||
                  "Someone"
                )}
              </strong>

              <span>
                ${escapeHTML(
                  notification.message ||
                  notification.type ||
                  "New notification"
                )}
              </span>
            </div>

          </div>
        `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = `
      <div class="empty">
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

async function markNotificationRead(id) {
  try {
    await api(
      `/notifications/${id}/read`,
      {
        method: "PUT"
      }
    );

    loadNotifications();
  } catch (error) {
    toast(error.message);
  }
}

async function markAllNotificationsRead() {
  if (!currentUser) return;

  try {
    await api(
      `/notifications/read-all/${getUserId()}`,
      {
        method: "PUT"
      }
    );

    toast("All notifications marked as read");

    loadNotifications();
  } catch (error) {
    toast(error.message);
  }
}

// =========================
// MODAL EVENTS
// =========================

function setupModalEvents() {
  $("closePostModal")?.addEventListener(
    "click",
    closePostModal
  );

  $("closeUserModal")?.addEventListener(
    "click",
    closeUserModal
  );

  $("postModal")?.addEventListener(
    "click",
    (event) => {
      if (event.target === $("postModal")) {
        closePostModal();
      }
    }
  );

  $("userModal")?.addEventListener(
    "click",
    (event) => {
      if (event.target === $("userModal")) {
        closeUserModal();
      }
    }
  );
}

// =========================
// EVENT LISTENERS
// =========================

function setupEventListeners() {
  $("loginBtn")?.addEventListener(
    "click",
    login
  );

  $("registerBtn")?.addEventListener(
    "click",
    register
  );

  $("showRegisterBtn")?.addEventListener(
    "click",
    showRegister
  );

  $("showLoginBtn")?.addEventListener(
    "click",
    showLogin
  );

  $("logoutBtn")?.addEventListener(
    "click",
    logout
  );

  document
    .querySelectorAll(".nav-item[data-page]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          showPage(
            button.dataset.page
          );
        }
      );
    });

  $("profileShortcut")?.addEventListener(
    "click",
    () => showPage("profile")
  );

  $("seeAllBtn")?.addEventListener(
    "click",
    () => showPage("search")
  );

  $("searchInput")?.addEventListener(
    "input",
    searchUsers
  );

  $("messageSearch")?.addEventListener(
    "input",
    filterConversations
  );

  $("sendMessageBtn")?.addEventListener(
    "click",
    sendMessage
  );

  $("messageInput")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        sendMessage();
      }
    }
  );

  $("createPostForm")?.addEventListener(
    "submit",
    createPost
  );

  $("editProfileBtn")?.addEventListener(
    "click",
    openEditProfile
  );

  $("cancelEditBtn")?.addEventListener(
    "click",
    cancelEditProfile
  );

  $("saveProfileBtn")?.addEventListener(
    "click",
    saveProfile
  );

  $("savedProfileTab")?.addEventListener(
    "click",
    () => showPage("saved")
  );

  setupModalEvents();
}

// =========================
// INITIALIZE
// =========================

function initializeApp() {
  setupEventListeners();

  if (currentUser) {
    showApp();
  } else {
    show("authSection");
    hide("appSection");
    showLogin();
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);