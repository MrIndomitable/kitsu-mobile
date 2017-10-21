import React from 'react';
import PropTypes from 'prop-types';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { View, RefreshControl } from 'react-native';
import { connect } from 'react-redux';

import { Kitsu } from 'kitsu/config/api';
import { defaultAvatar } from 'kitsu/constants/app';
import { listBackPurple } from 'kitsu/constants/colors';
import { TabBar, TabBarLink } from 'kitsu/screens/Feed/components/TabBar';
import { CreatePostRow } from 'kitsu/screens/Feed/components/CreatePostRow';
import { Post } from 'kitsu/screens/Feed/components/Post';
import { feedStreams } from './feedStreams';

class Feed extends React.PureComponent {
  static propTypes = {
    navigation: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  }

  static navigationOptions = {
    header: null,
  }

  state = {
    activeFeed: 'follower',
    refreshing: false,
    data: [],
  }

  componentDidMount = () => {
    this.fetchFeed();
  }

  onRefresh = () => {
    this.fetchFeed({ reset: true });
  }

  setActiveFeed = (feed) => {
    this.setState({ activeFeed: feed });
    this.fetchFeed({ reset: true });
  }

  currentPage = 0

  fetchFeed = async ({ reset = false } = {}) => {
    this.setState({ refreshing: true });

    const PAGE_SIZE = 20;
    if (reset) this.currentPage = 0;

    try {
      const result = await Kitsu.one('followingFeed', this.props.currentUser.id).get({
        include: 'media,actor,unit,subject,subject.user,subject.target_user,subject.spoiled_unit,subject.media,subject.target_group,subject.followed,subject.library_entry,subject.anime,subject.manga',
        page: {
          offset: this.currentPage * PAGE_SIZE,
          limit: PAGE_SIZE,
        },
      });

      this.currentPage += 1;

      // Discard the activity groups and activities for now, flattening to
      // just the subject of the activity.
      const data = reset ? [] : [...this.state.data];

      result.forEach((group) => {
        group.activities.forEach((activity) => {
          data.push(activity.subject);
        });
      });

      this.setState({ data });
    } catch (err) {
      console.log('Error while refreshing following feed: ', err);
    }

    this.setState({ refreshing: false });
  }

  navigateToPost = (props) => {
    this.props.navigation.navigate('PostDetails', props);
  }

  navigateToCreatePost = () => {
    this.props.navigation.navigate('CreatePost');
  }

  renderPost = ({ item }) => {
    // This dispatches based on the type of an entity to the correct
    // component. If it's not in here it'll just ignore the feed item.
    switch (item.type) {
      case 'posts':
        return (
          <Post
            post={item}
            onPostPress={this.navigateToPost}
          />
        );
      default:
        console.log(`WARNING: Ignored post type: ${item.type}`);
        return null;
    }
  }

  render() {
    return (
      <View style={{ flex: 1, backgroundColor: listBackPurple }}>
        <TabBar>
          {feedStreams.map(tabItem => (
            <TabBarLink
              key={tabItem.key}
              label={tabItem.label}
              isActive={this.state.activeFeed === tabItem.key}
              onPress={() => this.setActiveFeed(tabItem.key)}
            />
          ))}
        </TabBar>

        <View style={{ flex: 1 }}>
          <KeyboardAwareFlatList
            data={this.state.data}
            keyExtractor={item => `${item.type}:${item.id}`}
            renderItem={this.renderPost}
            ListHeaderComponent={
              <CreatePostRow onPress={this.navigateToCreatePost} />
            }
            refreshControl={
              <RefreshControl
                refreshing={this.state.refreshing}
                onRefresh={this.onRefresh}
              />
            }
          />
        </View>
      </View>
    );
  }
}

const mapStateToProps = ({ user }) => {
  const { currentUser } = user;
  return { currentUser };
};

export default connect(mapStateToProps)(Feed);
